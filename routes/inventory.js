const express = require("express");
const router = express.Router();
const tthPool = require("../models/tthDB");
const passport = require("passport");
const { ensureAuthenticated } = require("../middleware/middleware");

router.get("/", ensureAuthenticated, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 11;
  const isAjax = req.query.ajax === "true";
  const uacsCode = req.query.uacs || "";

  console.log("Received uacsCode:", req.query);

  try {
    const { getInventoryList, totalPages } = await fetchInventoryList(
      page,
      limit,
      uacsCode
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
    console.error("Detailed Error in /Inventory:", err.stack);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: err.message });
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
    console.log(
      `Fetching inventory list: page=${page}, limit=${limit}, uacsCode=${uacsCode}`
    );

    const query = `
  SELECT item_name, accountable, unit_cost, date_acquired, location, category, 
         uacs_code, inventory_item_no, burs_no, estimated_useful_life, po_no, 
         code, iar, supplier, serial_no, property_no, email, entity_name, 
         fund_cluster, NULL AS par_no, ics_no AS document_no, quantity, unit, 
         date, description, photo1, photo2, 'ICS' AS type
  FROM inventory_custodian_slip 
  WHERE uacs_code LIKE $1

  UNION ALL

  SELECT item_name, accountable, unit_cost, date_acquired, location, category, 
         uacs_code, inventory_item_no, burs_no, estimated_useful_life, po_no, 
         code, iar, supplier, serial_no, property_no, email, entity_name, 
         fund_cluster, par_no, NULL AS document_no, quantity, unit, 
         date, description, photo1, photo2, 'PAR' AS type
  FROM property_acknowledgement_receipt 
  WHERE uacs_code LIKE $1

  LIMIT $2 OFFSET $3
`;

    console.log("Executing main inventory query...");
    const { rows } = await tthPool.query(query, [
      `%${uacsCode}%`,
      limit,
      offset,
    ]);

    console.log(`Fetched ${rows.length} rows from inventory tables.`);

    // Query to count total rows
    const countQuery = `
      SELECT COUNT(*) AS total_count
      FROM (
        SELECT 'ICS' AS type FROM inventory_custodian_slip WHERE uacs_code LIKE $1
        UNION ALL
        SELECT 'PAR' AS type FROM property_acknowledgement_receipt WHERE uacs_code LIKE $1
      ) AS merged_tables
    `;

    console.log("Executing count query...");
    const countResult = await tthPool.query(countQuery, [`%${uacsCode}%`]);

    const totalCount = parseInt(countResult.rows[0].total_count);
    console.log(`Total count: ${totalCount}`);

    const totalPages = Math.ceil(totalCount / limit);
    return { getInventoryList: rows, totalPages };
  } catch (err) {
    console.error("Detailed Error in fetchInventoryList():", err.stack);
    throw new Error(`Error fetching inventory list: ${err.message}`);
  }
}

module.exports = router;
