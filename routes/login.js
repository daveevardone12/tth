const express = require("express");
const router = express.Router();
const Joi = require("joi");
const bcrypt = require("bcrypt");
const tthPool = require("../models/tthDB");

const userSchema = Joi.object({
  role: Joi.string().required(),
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

    // Check if the role matches
    if (user.role !== value.role) {
      req.flash("error", "Invalid role for the user");
      return res.redirect("/login");
    }

    // If login is successful, set up the session
    req.session.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    // Redirect based on the role
    if (user.role === "admin") {
      req.flash("success", "Admin login successful");
      return res.redirect("/dashboard");
    } else if (user.role === "employee") {
      req.flash("success", "Employee login successful");
      return res.redirect("/employee-dashboard");
    }

  } catch (err) {
    console.error("Error: ", err);
    res.status(500).send("Internal server error");
  }
});

module.exports = router;
