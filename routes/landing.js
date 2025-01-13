const express = require("express");
const router = express.Router();
const tthPool = require("../models/tthDB");
const { ensureAuthenticated } = require("../middleware/middleware");

router.get("/", ensureAuthenticated, (req, res) => {
  const success = req.query.success === "true";
  res.render("landing", { success });
});

module.exports = router;
