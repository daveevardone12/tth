const express = require("express");
const router = express.Router();
// const passport = require("passport");
const Joi = require("joi");
const bcrypt = require("bcrypt");
const tthPool = require("../models/tthDB");

const userSchema = Joi.object({
  email: Joi.string().required(),
  password: Joi.string().required()
});

// Login route
router.post("/login/submit", async (req, res, next) => {
  // Validate the incoming request body against the schema
  const { error, value } = userSchema.validate(req.body);

  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  try {
    // Check if the user exists in the database
    const userCheck = await tthPool.query(
      `SELECT * FROM users WHERE email = $1`,
      [value.email]
    );

    if (userCheck.rows.length === 0) {
      // If the user doesn't exist
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const user = userCheck.rows[0];

    const validPassword = await bcrypt.compare(value.password, user.password);

    if (!validPassword) {
      // If password is incorrect
      return res.status(400).json({ error: "Invalid email or password" });
    }

    // If login is successful, set up session or JWT
    // Set the user ID in session
    // req.session.userId = user.id; 

    req.flash("success", "Login successful");
    res.redirect("/login");

  } catch (err) {
    console.error("Error: ", err);
    res.status(500).send("Internal server error");
  }
});

module.exports = router;