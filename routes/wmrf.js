// wmrf.js
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

// GET route to render the form
router.get("/", ensureAuthenticated, (req, res) => {
  const success = req.query.success === "true";
  res.render("wmrf", { success });
});

router.get("/office", async (req, res) => {
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
        data.purpose || "Not Specified", // Ensure it's not NULL
        data.property_no,
        data.disposal_date,
        data.endUser || null,
        data.unit_value || 0, // Ensure no NULL constraint issues
        data.total_value || 0, // Ensure no NULL constraint issues
        destroyed || false,
        private_sale || false,
        public_auction || false,
        transfer || false,
        data.agency_name || null,
        data.description || null,
        photo1 || null,
        photo2 || null,
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
