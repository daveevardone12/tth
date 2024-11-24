const express = require('express');
const router = express.Router();
const tthPool = require('../models/tthDB');

router.get("/", (req, res) => {
  const userId = req.session.user;
  console.log(userId);
  if (!userId) {
    console.log("No userId in session. Redirecting to login.");
    return res.redirect('/login');
  }

  res.render("par");
});

router.post('/save', (req, res) => {
  const data = req.body;


  res.send('Data received!');
});

module.exports = router;
