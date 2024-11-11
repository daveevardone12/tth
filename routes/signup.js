const express = require("express");
const router = express.Router();
const Joi = require("joi");
const bcrypt = require("bcrypt");

const userSchema = Joi.object({
  firstname: Joi.string().required(),
  lastname: Joi.string().required(),
  email: Joi.string().email().required(), // Email format validation
  phone: Joi.string().required(),
  password: Joi.string().min(8).required(), // Password must be at least 8 characters
  role: Joi.string().valid("admin", "user").required(), // Validate user role
});

const tthPool = require("../models/tthDB");

router.post("/signup/submit", async (req, res) => {
  const { error, value } = userSchema.validate(req.body);

  if (error) {
    // If there's an error with the input, send error message
    req.flash("error", error.details[0].message);
    return res.redirect("/signup");
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(value.password, 10);
  
  try {
    // Check if email already exists
    const emailCheck = await tthPool.query(
      `SELECT * FROM users WHERE email = $1`,
      [value.email]
    );

    if (emailCheck.rows.length > 0) {
      // If email already exists, return error message
      req.flash("error", "Email is already taken.");
      return res.redirect("/signup");
    }

    // Insert new user into the database
    await tthPool.query(
      `INSERT INTO users (first_name, last_name, email, phone, password, role)
      VALUES ($1, $2, $3, $4, $5, $6)`,
      [value.firstname, value.lastname, value.email, value.phone, hashedPassword, value.role]
    );
    
    // Flash success message and redirect to login page
    req.flash("success", "Account created successfully. Please log in.");
    res.redirect("/login");  // Redirect to login after successful signup

  } catch (err) {
    console.error("Error: ", err);
    // Handle database errors
    req.flash("error", "Internal Server Error. Please try again.");
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
