const express = require('express');
const router = express.Router();
const tthPool = require('../models/tthDB');
const { ensureAuthenticated } = require("../middleware/middleware");

router.get("/", ensureAuthenticated, (req, res) => {
  res.render("rfid");
});

module.exports = router;
