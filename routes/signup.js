const express = require("express");
const router = express.Router();
const Joi = require("joi");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const { checkNotAuthenticated } = require("../middleware/middleware");

router.get("/signup", checkNotAuthenticated, (req, res) => {
  res.render("signup1");
});

const userSchema = Joi.object({
  firstname: Joi.string().required(),
  lastname: Joi.string().required(),
  email: Joi.string().email().required(), // Email format validation
  phone: Joi.string().required(),
  password: Joi.string().min(8).required(), // Password must be at least 8 characters
  role: Joi.string().valid("admin", "employee").required(), // Validate user role
});

const tthPool = require("../models/tthDB");

router.post("/signup/submit", async (req, res) => {
  const { error, value } = userSchema.validate(req.body);

  if (error) {
    req.flash("error", error.details[0].message);
    return res.redirect("/signup");
  }

  const passwordLenght = value.password.length;
  console.log("passwordLenght:", passwordLenght);

  const hashedPassword = await bcrypt.hash(value.password, 10);

  try {
    // Check if email already exists
    const emailCheck = await tthPool.query(
      `SELECT * FROM users WHERE email = $1`,
      [value.email]
    );

    if (emailCheck.rows.length > 0) {
      req.flash("error", "Email is already taken.");
      return res.redirect("/signup");
    }

    // Insert new user into the database
    await tthPool.query(
      `INSERT INTO users (first_name, last_name, email, phone, password, role, password_length)
      VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [value.firstname, value.lastname, value.email, value.phone, hashedPassword, value.role, passwordLenght]
    );

    // Send confirmation email using Nodemailer
    const transporter = nodemailer.createTransport({
      service: 'gmail', // Use Gmail (or another email service)
      auth: {
        user: 'davemarlon74@gmail.com', // Replace with your Gmail address
        pass: 'kchd wqti vvmb fzkn'  // Use the generated app password (see below)
      }
    });

    const mailOptions = {
      from: 'your-email@gmail.com',
      to: value.email,
      subject: 'Account Signup Confirmation',
      text: `Hello ${value.first_name},\n\nYour email has been changed. Welcome!\n\nRegards,\nThe Team`
    };

    // Send the email and handle the response properly
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending email: ', error);
        req.flash("error", "Error sending confirmation email. Please try again.");
        return res.redirect("/signup");  // Ensure to return here to avoid further responses
      } else {
        console.log('Email sent: ' + info.response);
      }
    });

    // Flash success message and redirect to login page after email is sent
    req.flash("success", "Account created successfully. Please log in.");
    return res.redirect("/login");  // Ensure the response is sent only once

  } catch (err) {
    console.error("Error: ", err);
    req.flash("error", "Internal Server Error. Please try again.");
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
