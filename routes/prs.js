const express = require("express");
const router = express.Router();
const tthPool = require("../models/tthDB");
const { ensureAuthenticated } = require("../middleware/middleware");
const tth = require("../models/tthDB");
const { date } = require("joi");

router.get("/", ensureAuthenticated, (req, res) => {
  const success = req.query.success === "true";
  res.render("prs", { success });
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
        data.date_acquired,
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
