const express = require("express");
const router = express.Router();
const tthPool = require("../models/tthDB");
const Joi = require("joi");
const nodemailer = require("nodemailer");
const { ensureAuthenticated } = require("../middleware/middleware");

const userSchema = Joi.object({
  firstname: Joi.string().required(),
  lastname: Joi.string().required(),
  newemail: Joi.string().email().required(), // Email format validation
  phone: Joi.string().required(),
  password: Joi.string().min(8).required(), // Password must be at least 8 characters
});

// Get route to render the user page, with session user check
router.get("/user", ensureAuthenticated, (req, res) => {
  const userData = req.user;
  const passwordLength = userData.password_length;
  const buwaNaPassoword = "*".repeat(passwordLength);
  res.render("user", { data: userData, password: buwaNaPassoword });
});

router.post("/user/changeEmail", async (req, res) => {
  const { error, value } = userSchema.validate(req.body);
  const userData = req.user;
  console.log("balyo:",value)
  try {

    const emailCheck = await tthPool.query(
      `SELECT * FROM users WHERE email = $1`,
      [value.newemail]
    );

    if (emailCheck.rows.length > 0) {
      req.flash("error", "Email is already taken.");
      return res.redirect("/user");
    }


    // Insert new user into the database
    await tthPool.query(
      `UPDATE users SET email = $1 WHERE user_id = $2`,
      [value.newemail, userData.user_id]
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
      to: value.newemail,
      subject: 'Account Signup Confirmation',
      text: `Hello ${userData.firstname},\n\nYour account has been successfully created in our system. Welcome!\n\nRegards,\nThe Team`
    };

    // Send the email and handle the response properly
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending email: ', error);
        req.flash("error", "Error sending confirmation email. Please try again.");
        return res.redirect("/user");  // Ensure to return here to avoid further responses
      } else {
        console.log('Email sent: ' + info.response);
      }
    });

    // Flash success message and redirect to login page after email is sent
    req.flash("success", "Email Updated Successful");
    return res.redirect("/user");  // Ensure the response is sent only once

  } catch (err) {
    console.error("Error: ", err);
    req.flash("error", "Internal Server Error. Please try again.");
    return res.status(500).json({ error: "Internal Server Error" });
  }
});
module.exports = router;

