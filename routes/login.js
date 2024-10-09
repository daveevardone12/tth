const express = require("express");
const router = express.Router();
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
      req.flash("error", "Invalid email or password");
      return res.redirect("/login");
    }

    const user = userCheck.rows[0];

    // Compare the hashed password with the user's password
    const validPassword = await bcrypt.compare(value.password, user.password);

    if (!validPassword) {
      // If password is incorrect
      req.flash("error", "Invalid email or password");
      return res.redirect("/login");
    }

    // If login is successful, redirect to the dashboard
    req.flash("success", "Login successful");
    return res.redirect("/dashboard"); // Change this to your actual dashboard route

  } catch (err) {
    console.error("Error: ", err);
    res.status(500).send("Internal server error");
  }
});

module.exports = router;
