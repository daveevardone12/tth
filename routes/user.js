const express = require("express");
const router = express.Router();
const tthPool = require("../models/tthDB");
const { ensureAuthenticated } = require("../middleware/middleware");

// Get route to render the user page, with session user check
router.get("/user", ensureAuthenticated, (req, res) => {
  console.log(req.user);
  const userData = req.user;

  res.render("user", { data: userData });
});

module.exports = router;
