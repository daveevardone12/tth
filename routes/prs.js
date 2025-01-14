const express = require("express");
const router = express.Router();
const tthPool = require("../models/tthDB");
const { ensureAuthenticated } = require("../middleware/middleware");

router.get("/", ensureAuthenticated, (req, res) => {
  const success = req.query.success === "true";
  res.render("prs", { success });
});

router.post("/save", async (req, res) => {
  const data = req.body;
  console.log(data);
  try {
    await tthPool.query(
      "INSERT INTO returned_items (office, quantity, unit, purpose, propertyNumber, dateAcquired, endUser, unitValue, totalValue, purposeOfReturningItems, description) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)",
      [
        data.office,
        data.quantity,
        data.unit,
        data.purpose,
        data.propertyNumber,
        data.dateAcquired,
        data.endUser,
        data.unitValue,
        data.totalValue,
        data.purposeOfReturningItems,
        data.description,
      ]
    );
    req.flash("success", "success");
    return res.redirect("/prs");
  } catch (error) {
    console.error("Error: ", error);
    req.flash("error", "An error occured while processing the request.");
    return res.redirect("/prs");
  }
});
module.exports = router;
