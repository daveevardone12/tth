const express = require('express');
const router = express.Router();
const tthPool = require('../models/tthDB');
const { ensureAuthenticated } = require("../middleware/middleware");

router.get("/", ensureAuthenticated, (req, res) => {
  res.render("inventory");
});

module.exports = router;
