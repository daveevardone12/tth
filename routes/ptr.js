const express = require("express");
const router = express.Router();
const tthPool = require("../models/tthDB");
const { ensureAuthenticated } = require("../middleware/middleware");
const tth = require("../models/tthDB");
const { date } = require("joi");

router.get("/", ensureAuthenticated, (req, res) => {
  const success = req.query.success === "true";
  const userData = req.user;
  const role = userData.role;
  res.render("ptr", { success, role });
});

router.get("/accountable", async (req, res) => {
  const { propertyNumber, document } = req.query;
  if (!propertyNumber) {
    return res.status(400).send("Property number is required");
  }

  console.log(req.query);

  const validTables = {
    par: "property_acknowledgement_receipt",
    ics: "inventory_custodian_slip",
  };

  const docType = validTables[document];
  if (!docType) return res.status(400).json({ error: "Invalid document type" });

  try {
    const result = await tthPool.query(
      `SELECT * FROM ${docType} WHERE property_no ILIKE $1`,
      [`%${propertyNumber}%`]
    );

    console.log(result.rows);

    if (result.rows.length > 0) {
      return res.json({ success: true, data: result.rows });
    } else {
      return res.json({
        success: false,
        error: "No matching property number found",
      });
    }
  } catch (err) {
    console.error("Error querying database:", err.stack, err.message);
    return res.status(500).send("Internal Server Error");
  }
});

router.post("/save", async (req, res) => {
  const data = req.body;
  console.log(data);

  try {
    // Update Inventory Custodian Slip (ICS)
    if (data.documentType === "ics") {
      const result = await tthPool.query(
        `UPDATE inventory_custodian_slip 
         SET accountable = $1, email = $2 
         WHERE accountable = $3 AND email = $4 
         RETURNING *;`,
        [
          data.to_accountable,
          data.to_email,
          data.from_accountable,
          data.from_email,
        ]
      );
      console.log("Updated ICS rows:", result.rows);
    }
    // Update Property Acknowledgement Receipt (PAR)
    else if (data.documentType === "par") {
      const result = await tthPool.query(
        `UPDATE property_acknowledgement_receipt 
         SET accountable = $1, email = $2 
         WHERE accountable = $3 AND email = $4 
         RETURNING *;`,
        [
          data.to_accountable,
          data.to_email,
          data.from_accountable,
          data.from_email,
        ]
      );
      console.log("Updated PAR rows:", result.rows);
    }

    // Insert into Property Transfer Receipt
    const insertResult = await tthPool.query(
      `INSERT INTO property_transfer_receipt (
        property_name, fund_cluster, from_accountable, to_accountable, 
        from_email, to_email, ptr_no, ptr_date, transfer_type, 
        specify_box, date_acquired, property_no, quantity, 
        amount, condition_ppe, description, reason_for_transfer
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
      )`,
      [
        data.property_name,
        data.fund_cluster,
        data.from_accountable,
        data.to_accountable,
        data.from_email,
        data.to_email,
        data.ptr_no,
        data.ptr_date,
        data.transfer_type,
        data.specify_box,
        data.date_acquired,
        data.property_no,
        data.quantity,
        data.amount,
        data.condition_ppe,
        data.description,
        data.reason_for_transfer,
      ]
    );
    console.log("Inserted rows:", insertResult.rows); // Log the inserted rows

    // Success Response
    req.flash("success", "Success");
    return res.redirect("/ptr");
  } catch (error) {
    console.error("Error: ", error);
    req.flash("error", "An error occurred while processing the request.");
    return res.redirect("/ptr");
  }
});

module.exports = router;
