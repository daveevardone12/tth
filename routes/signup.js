const express = require("express");
const router = express.Router();
const Joi = require("joi");
const bcrypt = require("bcrypt");

const userSchema = Joi.object({
  firstname: Joi.string().required(),
  lastname: Joi.string().required(),
  email: Joi.string().required(),
  phone: Joi.string().required(),
  password: Joi.string().required()
});

const tthPool = require("../models/tthDB");

router.post("/signup/submit", async (req, res) => {
  const { error, value } = userSchema.validate(req.body);


  if (error) {
      return res.status(400).json({ error: error.details[0].message });
  }

  const hashedPassword = await bcrypt.hash(value.password, 10);
  try {
      // Check if email already exists
      const emailCheck = await tthPool.query(
        `SELECT * FROM users WHERE email = $1`,
        [value.email]
      );

      if (emailCheck.rows.length > 0) {
        // Email already exists
        req.flash("error", "Email is already exist.");
        return res.redirect("/signup");
      }

      // Validate password length
      if (value.password.length < 8) {
        req.flash("error", "Password must be at least 8 characters long.");
        return res.redirect("/signup");
      } 

      // Insert new user
      await tthPool.query(
        `INSERT INTO users (first_name, last_name, email, phone, password)
        VALUES ($1, $2, $3, $4, $5)`,
        [value.firstname, value.lastname, value.email, value.phone, hashedPassword]
      );
      
      req.flash("success", "Account created successfully.");
      res.redirect("/signup");

  } catch (err) {
      console.error("Error: ", err);
      return res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
