const express = require("express");
const { ensureAuthenticated } = require("../middleware/middleware");
const router = express.Router();

router.get("/", ensureAuthenticated, (req, res) => {
  const success = req.query.success === "true";
  const userData = req.user;
  const role = userData.role;
  res.render("usem", { success, role });
});

module.exports = router;
