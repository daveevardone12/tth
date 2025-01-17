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

router.post("/save", async (req, res) => {
  const data = req.body;
  console.log(data);

  try {
    if (data.documentType === "ics") {
      await tthPool.query(
        `UPDATE ics SET accountable = ? WHERE accountable = ?`,
        [data.to_accountable, data.from_accountable]
      );
    } else if (data.documentType === "par") {
      await tthPool.query(
        `UPDATE par SET accountable = ? WHERE accountable = ?`,
        [data.to_accountable, data.from_accountable]
      );
    }

    await tthPool.query(
      "INSERT INTO property_transfer_receipt (property_name, fund_cluster, from_accountable, to_accountable, ptr_no, ptr_date, transfer_type, specify_box, date_acquired, property_no, quantity, amount, condition_ppe, description, reason_for_transfer) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)",
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
    req.flash("succes", "success");
    return res.redirect("/ptr");
  } catch (error) {
    console.error("Error: ", error);
    req.flash("error", "An error occured while processing the request.");
    return res.redirect("/ptr");
  }
});

module.exports = router;
