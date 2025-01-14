const express = require("express");
const router = express.Router();
const tthPool = require("../models/tthDB");
const { ensureAuthenticated } = require("../middleware/middleware");

router.get("/", ensureAuthenticated, (req, res) => {
  const success = req.query.success === "true";
  res.render("mrer", { success });
});

router.post("/save", async (req, res) => {
  const data = req.body;
  console.log(data);
  try {
    await tthPool.query(
      "INSERT INTO mrer (is_unserviceable, is_functional, office, quantity, unit, purpose, property_number, date_acquired, end_user, unit_value, total_value, under_warranty, others, other_details, reasons, description, overall_findings) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)",
      [
        data.is_unserviceable,
        data.is_functional,
        data.office,
        data.quantity,
        data.unit,
        data.purpose,
        data.property_number,
        data.date_acquired,
        data.end_user,
        data.unit_value,
        data.total_value,
        data.under_warranty,
        data.others,
        data.other_details,
        data.reasons,
        data.description,
        data.overall_findings,
      ]
    );
    req.flash("success", "sucess");
    return res.redirect("/mrer");
  } catch (error) {
    console.error("Error: ", error);
    req.flash("error", "An error occured while processing the request");
    return res.redirect("/mrer");
  }
});
module.exports = router;
