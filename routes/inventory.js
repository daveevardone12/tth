const express = require("express");
const router = express.Router();
const tthPool = require("../models/tthDB");
const passport = require("passport");
const { ensureAuthenticated } = require("../middleware/middleware");

router.get("/", ensureAuthenticated, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 11;
  const isAjax = req.query.ajax === "true";
  const uacsCode = req.query.uacs || ""; // Get the uacs parameter
  console.log("Received uacsCode:", req.query); // Log the uacs parameter value to confirm it's received

  try {
    const { getInventoryList, totalPages } = await fetchInventoryList(
      page,
      limit,
      uacsCode
    );

    if (isAjax) {
      console.log("Returning JSON response with uacs:", uacsCode); // Confirm that the uacsCode is passed correctly
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
  const limit = parseInt(req.query.limit) || 11;
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
         LIMIT 12`,
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
  const page = parseInt(req.query.page, 11) || 1;
  const limit = parseInt(req.query.limit, 11) || 11;
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

async function fetchInventoryList(page, limit, uacsCode) {
  const offset = (page - 1) * limit;

  try {
    // Query to fetch data from both tables with an added identifier column
    const query = `
      SELECT *, 'ICS' AS type FROM inventory_custodian_slip WHERE uacs_code LIKE $1
      UNION ALL
      SELECT *, 'PAR' AS type FROM property_acknowledgement_receipt WHERE uacs_code LIKE $1
      LIMIT $2 OFFSET $3
    `;

    // Execute the query to get the data
    const { rows } = await tthPool.query(query, [
      `%${uacsCode}%`,
      limit,
      offset,
    ]);

    // Query to count total rows from both tables (before pagination)
    const countQuery = `
      SELECT COUNT(*) AS total_count
      FROM (
        SELECT 'ICS' AS type FROM inventory_custodian_slip WHERE uacs_code LIKE $1
        UNION ALL
        SELECT 'PAR' AS type FROM property_acknowledgement_receipt WHERE uacs_code LIKE $1
      ) AS merged_tables
    `;
    const countResult = await tthPool.query(countQuery, [`%${uacsCode}%`]);
    const totalCount = parseInt(countResult.rows[0].total_count);

    // Calculate total pages for pagination
    const totalPages = Math.ceil(totalCount / limit);

    // Return the fetched data and pagination information
    return { getInventoryList: rows, totalPages };
  } catch (err) {
    console.error("Error: ", err);
    throw new Error("Error fetching inventory list");
  }
}

module.exports = router;
