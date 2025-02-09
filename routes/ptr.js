const express = require("express");
const router = express.Router();
const tthPool = require("../models/tthDB");
const { ensureAuthenticated } = require("../middleware/middleware");
const tth = require("../models/tthDB");
const { date } = require("joi");

router.get("/", ensureAuthenticated, (req, res) => {
  const success = req.query.success === "true";
  res.render("ptr", { success });
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
    if (data.documentType === "ics") {
      await tthPool.query(
        `UPDATE inventory_custodian_slip SET accountable = $1 WHERE accountable = $2`,
        [data.to_accountable, data.from_accountable]
      );
    } else if (data.documentType === "par") {
      await tthPool.query(
        `UPDATE property_acknowledgement_receipt SET accountable = $1 WHERE accountable = $2`,
        [data.to_accountable, data.from_accountable]
      );
    }

    await tthPool.query(
      `INSERT INTO property_transfer_receipt (
        property_name, fund_cluster, from_accountable, to_accountable, 
        ptr_no, ptr_date, transfer_type, specify_box, date_acquired, 
        property_no, quantity, amount, condition_ppe, description, reason_for_transfer
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
      )`,
      [
        data.property_name,
        data.fund_cluster,
        data.from_accountable,
        data.to_accountable,
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

    req.flash("success", "Success");
    return res.redirect("/ptr");
  } catch (error) {
    console.error("Error: ", error);
    req.flash("error", "An error occurred while processing the request.");
    return res.redirect("/ptr");
  }
});

module.exports = router;
