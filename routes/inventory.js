const express = require("express");
const router = express.Router();
const tthPool = require("../models/tthDB");
const { ensureAuthenticated } = require("../middleware/middleware");

router.get("/", ensureAuthenticated, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const isAjax = req.query.ajax === "true";

  try {
    const { getInventoryList, totalPages } = await fetchInventoryList(
      page,
      limit
    );

    if (isAjax) {
      return res.json({
        getInventoryList,
        currentPage: page,
        totalPages,
        limit,
      });
    }

    res.render("inventory", {
      getInventoryList,
      currentPage: page,
      totalPages,
      limit,
    });
  } catch (err) {
    console.error("Error: ", err);
    res.sendStatus(500);
  }
});

router.get("/search", ensureAuthenticated, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const { query } = req.query;

  try {
    let searchResult;

    if (!query) {
      searchResult = await tthPool.query(
        `SELECT * FROM property_acknowledgement_receipt ORDER BY date_acquired LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
    } else {
      searchResult = await tthPool.query(
        `SELECT * FROM property_acknowledgement_receipt WHERE
         accountable ILIKE $1
         OR location ILIKE $1
         LIMIT 10`,
        [`%${query}%`]
      );
    }

    const data = searchResult.rows.map((row) => ({
      ...row,
    }));

    res.json({ getInventoryList: data });
  } catch (err) {
    console.error("Error: ", err);
    res.status(500).send("An error occurred during the search.");
  }
});
router.get("/sort", ensureAuthenticated, async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const offset = (page - 1) * limit;
  const { date, docName } = req.query;

  try {
    let searchResult;

    if (!date && !docName) {
      // Default sorting by date_acquired if no parameters are provided
      searchResult = await tthPool.query(
        `SELECT * FROM property_acknowledgement_receipt 
         ORDER BY id ASC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
    } else {
      // Construct dynamic ORDER BY clause based on query parameters
      let orderBy = [];

      if (date) {
        orderBy.push(`date_acquired ${date === "ascending" ? "ASC" : "DESC"}`);
      }
      if (docName) {
        orderBy.push(`item_name ${docName === "a-z" ? "ASC" : "DESC"}`);
      }

      const orderByClause =
        orderBy.length > 0 ? `ORDER BY ${orderBy.join(", ")}` : "";

      searchResult = await tthPool.query(
        `SELECT * FROM property_acknowledgement_receipt 
         ${orderByClause} 
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
    }

    // Map and return data
    const data = searchResult.rows.map((row) => ({ ...row }));
    res.json({ getInventoryList: data });
  } catch (err) {
    console.error("Error: ", err);
    res.status(500).send("An error occurred during the search.");
  }
});

async function fetchInventoryList(page, limit) {
  const offset = (page - 1) * limit;

  try {
    const query = `
      SELECT *, COUNT(*) OVER() AS total_count
      FROM property_acknowledgement_receipt
      ORDER BY id
      LIMIT $1 OFFSET $2
    `;

    const { rows } = await tthPool.query(query, [limit, offset]);

    const totalItems = rows.length > 0 ? rows[0].total_count : 10;
    const totalPages = Math.ceil(totalItems / limit);

    const data = rows.map((row) => ({
      ...row,
    }));

    return { getInventoryList: data, totalPages };
  } catch (err) {
    console.error("Error: ", err);
    throw new Error("Error fetching inventory list");
  }
}

module.exports = router;
