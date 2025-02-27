const express = require("express");
const router = express.Router();
const tthPool = require("../models/tthDB");
const Joi = require("joi");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const { ensureAuthenticated } = require("../middleware/middleware");

const userSchema = Joi.object({
  firstname: Joi.string().required(),
  lastname: Joi.string().required(),
  newemail: Joi.string().email().required(), // Email format validation
  confirmemail: Joi.string().email().required(), // Email format validation
  phone: Joi.string().required(),
  password: Joi.string().min(8).required(), // Password must be at least 8 characters
});

const profileSchema = Joi.object({
  newfirstname: Joi.string().min(1).max(100).required(),
  newlastname: Joi.string().min(1).max(100).required(),
  newcontact: Joi.string().min(5).max(50).required(),
});

const passwordSchema = Joi.object({
  currentpassword: Joi.string().min(6).required(), // or your preferred rules
  newpassword: Joi.string().min(6).required(),
  confirmpassword: Joi.string().min(6).required(),
});

// Get route to render the user page, with session user check
router.get("/user", ensureAuthenticated, (req, res) => {
  const userData = req.user;
  const passwordLength = userData.password_length;
  const buwaNaPassword = "*".repeat(passwordLength); // Fixed typo
  const role = userData.role;

  res.render("user", { data: userData, password: buwaNaPassword, role });
});

router.post("/user/changeEmail", async (req, res) => {
  try {
    console.log("sinulod");
    // Ensure user is logged in
    if (!req.user || !req.user.user_id) {
      console.log("must be logged in");
      req.flash("error", "You must be logged in to change your email.");
      return res.redirect("/login");
    }

    const { newemail, confirmemail } = req.body;

    // Check if the emails match
    if (newemail !== confirmemail) {
      console.log("email do not match");
      req.flash("error", "Emails do not match.");
      return res.redirect("/user");
    }

    // Check if the new email is already taken
    const emailCheck = await tthPool.query(
      `SELECT * FROM users WHERE email = $1`,
      [newemail]
    );

    if (emailCheck.rows.length > 0) {
      console.log("already in use");
      req.flash("error", "Email is already in use.");
      return res.redirect("/user");
    }

    // Update user's email
    await tthPool.query(`UPDATE users SET email = $1 WHERE user_id = $2`, [
      newemail,
      req.user.user_id,
    ]);

    // Set up Nodemailer
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER, // Use environment variables
        pass: process.env.EMAIL_PASS, // Store this safely
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: newemail,
      subject: "Email Changed Successfully",
      text: `Hello ${req.user.firstname},\n\nYour email has been updated successfully!\n\nBest,\nThe Team`,
    };

    // Send email
    await transporter.sendMail(mailOptions);

    console.log("success");
    req.flash("success", "Email updated successfully!");
    return res.redirect("/user");
  } catch (err) {
    console.error("Error updating email: ", err);
    req.flash("error", "Internal Server Error.");
    return res.status(500).redirect("/user");
  }
});

router.post("/user/changeProfile", async (req, res) => {
  console.log("Change profile: ", req.body);
  try {
    console.log("sinulod");
    if (!req.user || !req.user.user_id) {
      req.flash("error", "You must be logged in.");
      return res.redirect("/login");
    }

    const { new_firstname, new_lastname, phone } = req.body;
    if (!new_firstname || !new_lastname || !phone) {
      req.flash("error", "All fields are required.");
      return res.redirect("/user");
    }

    // Update user profile in database
    await tthPool.query(
      `UPDATE users SET first_name = $1, last_name = $2, phone = $3 WHERE user_id = $4`,
      [new_firstname, new_lastname, phone, req.user.user_id]
    );

    // Fetch updated user data and update req.user
    const updatedUser = await tthPool.query(
      `SELECT * FROM users WHERE user_id = $1`,
      [req.user.user_id]
    );

    req.user = updatedUser.rows[0]; // Update session user data

    req.flash("success", "Profile updated successfully!");
    return res.redirect("/user");
  } catch (err) {
    console.error("Error updating profile: ", err);
    req.flash("error", "Internal Server Error.");
    return res.status(500).redirect("/user");
  }
});

router.post("/user/changePassword", async (req, res) => {
  // 1. Validate input with Joi
  const { error, value } = passwordSchema.validate(req.body);
  if (error) {
    req.flash("error", "Invalid input for password change.");
    return res.redirect("/user");
  }

  // 2. Ensure user is logged in
  const userData = req.user;
  if (!userData || !userData.user_id) {
    req.flash("error", "You must be logged in to change your password.");
    return res.redirect("/login");
  }

  const { currentpassword, newpassword, confirmpassword } = value;
  const passwordLenght = newpassword.length;
  try {
    // 3. Get the stored (hashed) password from the DB
    const getUserQuery = `SELECT password FROM users WHERE user_id = $1`;
    const { rows } = await tthPool.query(getUserQuery, [userData.user_id]);
    if (rows.length === 0) {
      req.flash("error", "User not found.");
      return res.redirect("/user");
    }

    const storedHashedPassword = rows[0].password;

    // 4. Compare current password with stored hashed password
    const isMatch = await bcrypt.compare(currentpassword, storedHashedPassword);
    if (!isMatch) {
      req.flash("error", "Current password is incorrect.");
      return res.redirect("/user");
    }

    // 5. Check if new password and confirm password match
    if (newpassword !== confirmpassword) {
      req.flash("error", "New passwords do not match.");
      return res.redirect("/user");
    }

    // 6. Hash the new password
    const saltRounds = 10;
    const newHashedPassword = await bcrypt.hash(newpassword, saltRounds);

    // 7. Update the user's password in the database
    const updateQuery = `
      UPDATE users
      SET password = $1, password_length = $3
      WHERE user_id = $2
    `;
    await tthPool.query(updateQuery, [
      newHashedPassword,
      userData.user_id,
      passwordLenght,
    ]);

    // 8. Success handling
    req.flash("success", "Password updated successfully!");
    return res.redirect("/user");
  } catch (err) {
    // 9. Error handling
    console.error("Error changing password:", err);
    req.flash("error", "Internal Server Error. Please try again.");
    return res.status(500).redirect("/user");
  }
});

module.exports = router;
