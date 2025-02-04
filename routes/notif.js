const express = require("express");
const router = express.Router();
const tthPool = require("../models/tthDB");
const { ensureAuthenticated } = require("../middleware/middleware");
require("dotenv").config();

router.get("/", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const isAjax = req.query.ajax === "true";

  try {
    const { getRFIDList } = await fetchRFIDList();

    if (isAjax) {
      res.setHeader("Content-Type", "application/json");
      return res.json({
        getRFIDList,
      });
    }

    res.render("notif", {
      getRFIDList,
    });
  } catch (err) {
    console.error("Error: ", err.message, err.stack);
    if (isAjax) {
      return res.status(500).json({ error: "Internal server error" });
    }
    res.status(500).send("Internal server error");
  }
});

router.get("/notif", ensureAuthenticated, async (req, res) => {
  const role = userData.role;
  // Render only the new data to the frontend
  res.render("notifData");
});

async function fetchRFIDList() {
  try {
    // Fetch RFID logs and associated tags
    const getRFIDList = await tthPool.query(
      `
      SELECT 
        rfid_logs.tag_id, 
        rfid_logs.time, 
        rfid_logs.status, 
        rfid_tags.assigned_items,
        CASE
          WHEN rfid_tags.tag_id IS NULL THEN 'Not Registered'
          ELSE rfid_tags.assigned_items
        END AS item_status
      FROM 
        rfid_logs
      LEFT JOIN 
        rfid_tags
      ON 
        rfid_logs.tag_id = rfid_tags.tag_id
      ORDER BY 
        log_id DESC;
      `
    );

    return {
      getRFIDList: getRFIDList.rows,
    };
  } catch (err) {
    console.error("Error in fetchRFIDList at page:", "\n", err.message);
    throw new Error("Error fetching RFID list from database");
  }
}

module.exports = router;
