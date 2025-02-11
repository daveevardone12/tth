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

router.get("/search", async (req, res) => {
  const { query = "", page = 1, limit = 10 } = req.query;

  console.log("Received search request:", { query, page, limit });

  try {
    const inventory = await fetchInventoryList(page, limit, query);
    res.json(inventory);
  } catch (error) {
    console.error("Error in /Inventory/search route:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/sort", ensureAuthenticated, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 11;
  const uacsCode = req.query.uacs || "";
  const { date, docName } = req.query;
  const isAjax = req.query.ajax === "true";

  try {
    const { getInventoryList, totalPages } = await fetchInventoryList(
      page,
      limit,
      uacsCode
    );

    // Sort the retrieved data based on query parameters
    const sortedData = [...getInventoryList].sort((a, b) => {
      let result = 0;
      if (date) {
        result =
          date === "ascending"
            ? new Date(a.date_acquired) - new Date(b.date_acquired)
            : new Date(b.date_acquired) - new Date(a.date_acquired);
      }
      if (docName && result === 0) {
        result =
          docName === "a-z"
            ? a.item_name.localeCompare(b.item_name)
            : b.item_name.localeCompare(a.item_name);
      }
      return result;
    });

    if (isAjax) {
      return res.json({
        getInventoryList: sortedData,
        currentPage: page,
        totalPages,
        limit,
      });
    }

    res.render("inventory", {
      getInventoryList: sortedData,
      currentPage: page,
      totalPages,
      limit,
    });
  } catch (err) {
    console.error("Error in /sort:", err);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: err.message });
  }
});

async function fetchInventoryList(page, limit, searchQuery = "") {
  const offset = (page - 1) * limit;
  let params = [limit, offset]; // Default parameters
  let whereClause = "";

  try {
    console.log(
      `Fetching inventory list: page=${page}, limit=${limit}, searchQuery=${searchQuery}`
    );

    // Add filtering condition only if searchQuery is provided
    if (searchQuery.trim() !== "") {
      whereClause = `
        WHERE (
          accountable ILIKE $3 OR 
          location ILIKE $3 OR 
          CAST(uacs_code AS TEXT) ILIKE $3
        )
      `;
      params.push(`%${searchQuery}%`); // Ensure the searchQuery parameter is last
    }

    const query = `
      SELECT item_name, accountable, unit_cost, date_acquired, location, category, 
             uacs_code, inventory_item_no, burs_no, estimated_useful_life, 
             po_no, code, iar, supplier, serial_no, property_no, email, 
             entity_name, fund_cluster, ics_no, quantity, unit, date, 
             description, photo1, photo2, 'ICS' AS type
      FROM inventory_custodian_slip
      ${whereClause}

      UNION ALL

      SELECT item_name, accountable, unit_cost, date_acquired, location, category, 
             uacs_code, inventory_item_no, burs_no, estimated_useful_life, 
             po_no, code, iar, supplier, serial_no, property_no, email, 
             entity_name, fund_cluster, par_no, quantity, unit, date, 
             description, photo1, photo2, 'PAR' AS type
      FROM property_acknowledgement_receipt
      ${whereClause}

      LIMIT $1 OFFSET $2
    `;

    console.log("Executing query with:", params);
    const { rows } = await tthPool.query(query, params);

    console.log(`Fetched ${rows.length} rows from inventory.`);

    return { getInventoryList: rows };
  } catch (err) {
    console.error("Error in fetchInventoryList():", err.stack);
    throw new Error(`Error fetching inventory list: ${err.message}`);
  }
}

module.exports = router;
