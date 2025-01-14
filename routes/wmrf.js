// wmrf.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const tthPool = require("../models/tthDB");
const { ensureAuthenticated } = require("../middleware/middleware");

// Configure Multer to use memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// GET route to render the form
router.get("/", ensureAuthenticated, (req, res) => {
  const success = req.query.success === "true";
  res.render("wmrf", { success });
});

// POST route to handle form submission
router.post(
  "/save",
  upload.fields([
    { name: "photo1", maxCount: 1 },
    { name: "photo2", maxCount: 1 },
  ]),
  async (req, res) => {
    // Log incoming data for debugging
    console.log("req.body:", req.body);
    console.log("req.files:", req.files);

    // Extract text fields from req.body
    const data = req.body;

    // Extract files from req.files
    const photo1 = req.files.photo1 ? req.files.photo1[0].buffer : null;
    const photo2 = req.files.photo2 ? req.files.photo2[0].buffer : null;

    // Convert checkbox values to boolean
    const destroyed = data.destroyed === "on";
    const private_sale = data.private_sale === "on";
    const public_auction = data.public_auction === "on";
    const transfer = data.transfer === "on";

    try {
      // Insert data into PostgreSQL
      const insertQuery = `
        INSERT INTO wmrf_reports (
          entity_name, fund_cluster, wmr_no, storage, office, quantity, unit, purpose, 
          property_no, disposal_date, end_user, unit_value, total_value, destroyed, 
          private_sale, public_auction, transfer, agency_name, description, photo1, photo2
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
        )
        RETURNING id
      `;

      const values = [
        data.entity_name,
        data.fund_cluster,
        data.wmr_no,
        data.storage,
        data.office,
        data.quantity,
        data.unit,
        data.purpose,
        data.property_no,
        data.disposal_date,
        data.end_user,
        data.unit_value,
        data.total_value,
        destroyed,
        private_sale,
        public_auction,
        transfer,
        data.agency_name || null,
        data.description || null,
        photo1,
        photo2,
      ];

      const result = await tthPool.query(insertQuery, values);
      const insertedId = result.rows[0].id;

      console.log(`New WMRF record inserted with ID: ${insertedId}`);

      // Redirect with success message
      req.flash("success", "Data saved successfully.");
      return res.redirect("/wmrf?success=true");
    } catch (error) {
      console.error("Error: ", error);
      req.flash("error", "An error occurred while processing the request.");
      return res.redirect("/wmrf");
    }
  }
);

module.exports = router;
