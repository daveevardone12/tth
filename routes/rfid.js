const express = require("express");
const router = express.Router();
const tthPool = require("../models/tthDB");
const { ensureAuthenticated } = require("../middleware/middleware");
const tth = require("../models/tthDB");

router.get("/save", async (req, res) => {
  const { propertyNumber, document } = req.query;
  if (!propertyNumber) {
    return res.status(400).send("property number is requried");
  }
  console.log(req.query);
  let docType;

  if (document === "par") {
    docType = "property_acknowledgement_receipt";
  } else if (document === "ics") {
    docType = "inventory_custodian_slip";
  }

  try {
    const result = await tthPool.query(
      `SELECT * FROM ${docType} WHERE property_no ILIKE $1`,
      [`%${propertyNumber}%`]
    );

    console.log(result);

    if (result.rows.length > 0) {
      return res.json({ success: true, data: result.rows });
      console.log(data);
    } else {
      return res.json({
        success: false,
        error: "No matching property no. found",
      });
    }
  } catch (err) {
    console.error("Error querying database:", err.stack, err.message);
    return res.status(500).send("Internal Server Error");
  }
});

router.post("/save/rfid", async (req, res) => {
  const data = req.body;
  console.log(data);

  try {
    await tthPool.query("INSERT INTO rfid_tags (tag_id) VALUES ($1)", [
      data.rfid_tag,
    ]);
    req.flash("success", "success");
    return res.redirect("/rfid");
  } catch (error) {
    console.error("Error: ", error);
    req.flash("error", "An error occurred while processing the request.");
    return res.redirect("/rfid");
  }
});

//assign
router.post("/save/rfid-update", async (req, res) => {
  const data = req.body;
  console.log(data);
  try {
    await tthPool.query(
      "UPDATE rfid_tags SET property_no = $1, assigned_items = $2 WHERE tag_id = $3",
      [data.property_no, data.item_name, data.tag_id]
    );
    req.flash("success", "success");
    return res.redirect("/rfid");
  } catch (error) {
    console.error("Error: ", error);
    req.flash("error", "An error occurred while processing the request.");
    return res.redirect("/rfid");
  }
});

//update
router.post("/save/rfid-update_tag", async (req, res) => {
  const data = req.body;
  console.log(data);
  try {
    await tthPool.query("UPDATE rfid_tags SET tag_id = $1 WHERE tag_id = $2", [
      data.new_rfid_tag,
      data.currentTagId,
    ]);
    req.flash("success", "RFID tag updated successfully");
    return res.redirect("/rfid");
  } catch (error) {
    console.error("Error: ", error);
    req.flash("error", "An error occurred while updating the RFID tag.");
    return res.redirect("/rfid");
  }
});

// Delete RFID tag from the database
router.post("/delete/rfid", async (req, res) => {
  const { tag_id } = req.body; // Assuming the tag_id is sent in the request body
  console.log(tag_id);
  try {
    await tthPool.query("DELETE FROM rfid_tags WHERE tag_id = $1", [tag_id]);
    req.flash("success", "RFID tag deleted successfully");
    return res.redirect("/rfid");
  } catch (error) {
    console.error("Error: ", error);
    req.flash("error", "An error occurred while deleting the RFID tag.");
    return res.redirect("/rfid");
  }
});

// fetch rfid data
router.get("/", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const isAjax = req.query.ajax === "true";

  try {
    const userData = req.user;
    const role = userData.role;
    const { getRFIDList, totalPages } = await fetchRFIDList(page, limit);

    if (isAjax) {
      res.setHeader("Content-Type", "application/json");
      return res.json({
        getRFIDList,
        currentPage: page,
        totalPages,
        limit,
        role,
      });
    }

    res.render("rfid", {
      getRFIDList,
      currentPage: page,
      totalPages,
      limit,
      role,
    });
  } catch (err) {
    console.error("Error: ", err.message, err.stack);
    if (isAjax) {
      return res.status(500).json({ error: "Internal server error" });
    }
    res.status(500).send("Internal server error");
  }
});

// auto suggestion for property_number
router.get("/property_no", async (req, res) => {
  const { propertyNumber } = req.query;

  if (!propertyNumber) {
    return res.status(400).send("Property number is required.");
  }

  console.log("Received propertyNumber:", propertyNumber);

  try {
    // First, check in property_acknowledgement_receipt
    const receiptResult = await tthPool.query(
      `SELECT * FROM property_acknowledgement_receipt WHERE property_no ILIKE $1`,
      [`${propertyNumber}`]
    );

    console.log("property_acknowledgement_receipt result:", receiptResult.rows);

    if (receiptResult.rows.length > 0) {
      return res.json({
        success: true,
        source: "property_acknowledgement_receipt",
        data: receiptResult.rows,
      });
    }

    // If not found, check in inventory_custodian_slip
    const slipResult = await tthPool.query(
      `SELECT * FROM inventory_custodian_slip WHERE property_no ILIKE $1`,
      [`${propertyNumber}`]
    );

    console.log("inventory_custodian_slip result:", slipResult.rows);

    if (slipResult.rows.length > 0) {
      return res.json({
        success: true,
        source: "inventory_custodian_slip",
        data: slipResult.rows,
      });
    }

    // If not found in both tables
    return res.json({
      success: false,
      error: "No matching property number found in both records.",
    });
  } catch (err) {
    console.error("Error querying database:", err.stack, err.message);
    return res.status(500).send("Internal Server Error");
  }
});

async function fetchRFIDList(page, limit) {
  const offset = (page - 1) * limit;

  try {
    // Get the total count of RFID tags
    const totalRFID = await tthPool.query(`
      SELECT COUNT(*) as count
      FROM rfid_tags;
    `);

    const totalItems = parseInt(totalRFID.rows[0].count, 10);
    const totalPages = Math.ceil(totalItems / limit);

    // Handle empty results
    if (totalItems === 0) {
      console.log("No RFID tags found in the database.");
      return {
        getRFIDList: [],
        totalPages: 0,
        totalItems: 0,
      };
    }

    // Fetch RFID tags with pagination and join with other tables
    const getRFIDList = await tthPool.query(
      `
        SELECT 
          rt.tag_id, 
          rt.property_no, 
          rt.time, 
          rt.status, 
          rt.assigned_items,
          par.email as email1,
          ics.email as email
        FROM rfid_tags rt
        LEFT JOIN property_acknowledgement_receipt par
          ON rt.property_no = par.property_no
        LEFT JOIN inventory_custodian_slip ics
          ON rt.property_no = ics.property_no
        LIMIT $1 OFFSET $2;
        `,
      [limit, offset]
    );

    return {
      getRFIDList: getRFIDList.rows,
      totalPages,
      totalItems,
    };
  } catch (err) {
    console.error(
      "Error in fetchRFIDList at page:",
      page,
      "limit:",
      limit,
      "\n",
      err.message
    );
    throw new Error("Error fetching RFID list from database");
  }
}

module.exports = router;
