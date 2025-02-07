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
  const buwaNaPassoword = "*".repeat(passwordLength);
  const role = userData.role;
  res.render("user", { data: userData, password: buwaNaPassoword, role });
});

router.post("/user/changeEmail", async (req, res) => {
  const { error, value } = userSchema.validate(req.body);
  const userData = req.user;
  console.log("balyo:", value);
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
    await tthPool.query(`UPDATE users SET email = $1 WHERE user_id = $2`, [
      value.newemail,
      userData.user_id,
    ]);

    // Send confirmation email using Nodemailer
    const transporter = nodemailer.createTransport({
      service: "gmail", // Use Gmail (or another email service)
      auth: {
        user: "davemarlon74@gmail.com", // Replace with your Gmail address
        pass: "ecqo yjba ayhn nbvr", // Use the generated app password (see below)
      },
    });

    const mailOptions = {
      from: "your-email@gmail.com",
      to: value.newemail,
      subject: "Account Signup Confirmation",
      text: `Hello ${userData.firstname},\n\nYour account has been successfully created. Welcome!\n\nRegards,\nThe Team`,
    };

    // Send the email and handle the response properly
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending email: ", error);
        req.flash(
          "error",
          "Error sending confirmation email. Please try again."
        );
        return res.redirect("/user"); // Ensure to return here to avoid further responses
      } else {
        console.log("Email sent: " + info.response);
      }
    });

    // Flash success message and redirect to login page after email is sent
    req.flash("success", "Email Updated Successful");
    return res.redirect("/user"); // Ensure the response is sent only once
  } catch (err) {
    console.error("Error: ", err);
    req.flash("error", "Internal Server Error. Please try again.");
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/user/changeProfile", async (req, res) => {
  // 1. Validate incoming data with Joi
  const { error, value } = profileSchema.validate(req.body);

  // If validation fails, handle error
  if (error) {
    req.flash("error", "Invalid input for profile update.");
    return res.redirect("/user"); // or wherever you want to redirect
  }

  // 2. Get the user from req.user (based on your auth logic)
  const userData = req.user; // e.g. { user_id, firstname, lastname, email, etc. }
  if (!userData || !userData.user_id) {
    req.flash("error", "You must be logged in to edit your profile.");
    return res.redirect("/login");
  }

  try {
    // 3. Prepare the UPDATE statement
    const updateQuery = `
      UPDATE users
      SET first_name = $1,
          last_name  = $2,
          phone   = $3
      WHERE user_id = $4
    `;

    // 4. Execute the UPDATE
    await tthPool.query(updateQuery, [
      value.newfirstname,
      value.newlastname,
      value.newcontact,
      userData.user_id,
    ]);

    // 5. Success handling
    req.flash("success", "Profile updated successfully!");
    return res.redirect("/user"); // or wherever you want to go after updating
  } catch (err) {
    // 6. Error handling
    console.error("Error updating profile: ", err);
    req.flash("error", "Internal Server Error. Please try again.");
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
