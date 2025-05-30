const express = require("express");
const router = express.Router();
const multer = require("multer");
const tthPool = require("../models/tthDB");
const { ensureAuthenticated } = require("../middleware/middleware");
const tth = require("../models/tthDB");
const { date } = require("joi");

// Configure Multer to use memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.get("/", ensureAuthenticated, (req, res) => {
  const success = req.query.success === "true";
  const userData = req.user;
  const role = userData.role;
  res.render("ics", { success, role });
});

router.post(
  "/save",
  upload.fields([
    { name: "photo1", maxCount: 1 },
    { name: "photo2", maxCount: 1 },
  ]),
  async (req, res) => {
    const data = req.body;
    console.log(data);

    // Log incoming data for debugging
    console.log("req.body:", req.body);
    console.log("req.files:", req.files);

    const photo1 = req.files?.photo1?.[0]?.buffer || null;
    const photo2 = req.files?.photo2?.[0]?.buffer || null;
    try {
      await tthPool.query(
        `INSERT INTO inventory_custodian_slip (item_name, accountable, unit_cost, date_acquired, location, category, uacs_code, inventory_item_no, burs_no, estimated_useful_life, po_no, code, iar, supplier, serial_no, property_no, email, entity_name, fund_cluster, ics_no, quantity, unit, date, description, photo1, photo2)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)`,
        [
          data.itemName,
          data.accountable,
          data.cost,
          data.dateAcquired,
          data.location,
          data.category,
          data.uacs_code,
          data.inventoryNo,
          data.burs,
          data.estimatedLife,
          data.POnumber,
          data.code,
          data.IAR,
          data.supplier,
          data.serialNumber,
          data.propertyNumber,
          data.email,
          data.entity_name,
          data.fund_cluster,
          data.ics_no,
          data.quantity,
          data.unit,
          data.date,
          data.description,
          photo1,
          photo2,
        ]
      );

      req.flash("success", "success");
      return res.redirect("/ics");
    } catch (error) {
      console.error("Error: ", error);
      req.flash("error", "An error occurred while processing the request.");
      return res.redirect("/ics");
    }
  }
);

module.exports = router;
