const express = require("express");
const router = express.Router();
const tthPool = require("../models/tthDB");
const { ensureAuthenticated } = require("../middleware/middleware");

router.get("/", ensureAuthenticated, (req, res) => {
  const success = req.query.success === "true";
  res.render("ptr", { success });
});

router.post("/save", async (req, res) => {
  const data = req.body;
  console.log(data);
  try {
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
