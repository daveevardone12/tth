const express = require("express");
const router = express.Router();
const tthPool = require("../models/tthDB");
const { ensureAuthenticated } = require("../middleware/middleware");

router.get("/", ensureAuthenticated, (req, res) => {
  const success = req.query.success === "true";
  res.render("par", { success });
});

router.post("/save", async (req, res) => {
  const data = req.body;
  console.log(data);
  try {
    await tthPool.query(
      `INSERT INTO property_acknowledgement_receipt (item_name, accountable, unit_cost, date_acquired, location, category, uacs_code, inventory_item_no, burs_no, estimated_useful_life, po_no, code, iar, supplier, serial_no, property_no, rfid_code, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
      [
        data.itemName,
        data.accountable,
        data.cost,
        data.dateAcquired,
        data.location,
        data.category,
        data.uacs,
        data.inventoryNo,
        data.burs,
        data.estimatedLife,
        data.POnumber,
        data.code,
        data.IAR,
        data.supplier,
        data.serialNumber,
        data.propertyNumber,
        data.RFIDcode,
        data.description,
      ]
    );
    req.flash("success", "success");
    return res.redirect("/par");
  } catch (error) {
    console.error("Error: ", error);
    req.flash("error", "An error occurred while processing the request.");
    return res.redirect("/par");
  }
});

module.exports = router;
