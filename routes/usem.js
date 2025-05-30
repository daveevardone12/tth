const express = require("express");
const router = express.Router();
const Joi = require("joi");
const bcrypt = require("bcrypt");
const passport = require("passport");
const nodemailer = require("nodemailer");
const { ensureAuthenticated } = require("../middleware/middleware"); // Import middleware
const pool = require("../models/tthDB"); // Ensure pool is imported
const tthPool = require("../models/tthDB");

const userSchema = Joi.object({
  firstname: Joi.string().required(),
  lastname: Joi.string().required(),
  email: Joi.string().email().required(), // Email format validation
  phone: Joi.string().required(),
  password: Joi.string().min(8).required(), // Password must be at least 8 characters
  role: Joi.string().valid("Admin", "Employee").required(), // Validate user role
});

router.get("/", ensureAuthenticated, async (req, res) => {
  const success = req.query.success === "true";
  const userData = req.user;
  const role = userData.role;
  // waray nim kabutang an id
  try {
    const result = await pool.query(
      `SELECT first_name, last_name, email, phone, role, user_id,
       COALESCE(status, 'Inactive') AS status,
       TO_CHAR(last_login, 'FMMonth DD, YYYY HH12:MI AM') AS last_login 
FROM users;`
    );

    const users = result.rows.map((user) => ({
      ...user,
      full_name: `${user.first_name} ${user.last_name}`,
      last_login: user.last_login || "Not Yet Logged In", // Show 'Never' if NULL
    }));

    res.render("usem", { success, role, users });
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).send("Error fetching users");
  }
});

//search account
router.get("/search", async (req, res) => {
  const query = req.query.query;
  try {
    const result = await pool.query(
      `SELECT first_name, last_name, email, role, status, last_login, user_id 
       FROM users 
       WHERE LOWER(first_name) LIKE LOWER($1) 
          OR LOWER(last_name) LIKE LOWER($1) 
          OR LOWER(email) LIKE LOWER($1)`,
      [`%${query}%`]
    );

    const users = result.rows.map((user) => ({
      ...user,
      full_name: `${user.first_name} ${user.last_name}`,
      last_login: user.last_login
        ? new Date(user.last_login).toLocaleString("en-US", {
            hour: "numeric",
            minute: "numeric",
            hour12: true,
          })
        : "Never",
    }));

    res.json(users);
  } catch (err) {
    console.error("Error searching users:", err);
    res.status(500).json({ error: "Error searching users" });
  }
});

//remove account
router.post("/remove/user", async (req, res) => {
  const { user_id } = req.body;
  console.log("body: ", req.body);
  try {
    await pool.query("Delete From users Where user_id = $1", [user_id]);
    req.flash("success", "User Deleted Succesfully");
    return res.redirect("/usem");
  } catch (error) {
    console.error("Error: ", error);
    req.flash("error", "An error occurred while deleting the user.");
    return res.redirect("/usem");
  }
});

// modify role
router.post("/modify-role", async (req, res) => {
  try {
    const { newRole, userId } = req.body;

    if (!userId || !newRole) {
      return res.status(400).json({ error: "User ID and role are required." });
    }

    // If new role is admin, check current admin count
    if (newRole.toLowerCase() === "admin") {
      const adminCountResult = await pool.query(
        `SELECT COUNT(*) FROM users WHERE LOWER(role) = 'admin'`
      );
      const adminCount = parseInt(adminCountResult.rows[0].count, 10);

      // Check if the user is already admin
      const currentUserResult = await pool.query(
        `SELECT role FROM users WHERE user_id = $1`,
        [userId]
      );

      if (currentUserResult.rowCount === 0) {
        return res.status(404).json({ error: "User not found." });
      }

      const currentRole = currentUserResult.rows[0].role.toLowerCase();

      // If trying to promote to admin and already 2 admins (and user is not already admin), reject
      if (adminCount >= 2 && currentRole !== "admin") {
        return res.status(400).json({
          error: "Role update denied. Only 2 admins are allowed in the system.",
        });
      }
    }

    const updateQuery =
      "UPDATE users SET role = $1 WHERE user_id = $2 RETURNING *";
    const result = await pool.query(updateQuery, [newRole, userId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    const updatedUser = result.rows[0];

    res.status(200).json({
      message: "Role updated successfully.",
      user: {
        user_id: updatedUser.user_id,
        first_name: updatedUser.first_name,
        last_name: updatedUser.last_name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        status: updatedUser.status,
        last_login: updatedUser.last_login,
      },
    });
  } catch (error) {
    console.error("Error updating role:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

//add account
router.post("/signup/submit", async (req, res) => {
  const { error, value } = userSchema.validate(req.body);

  if (error) {
    req.flash("error", error.details[0].message);
    return res.redirect("/usem");
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
      return res.redirect("/usem");
    }

    // ✅ Enforce max 2 admins rule
    if (value.role.toLowerCase() === "admin") {
      const adminCountResult = await tthPool.query(
        `SELECT COUNT(*) FROM users WHERE LOWER(role) = 'admin'`
      );
      const adminCount = parseInt(adminCountResult.rows[0].count, 10);
      console.log("Current admin count:", adminCount);

      if (adminCount >= 2) {
        req.flash("error", "Only 2 admin accounts are allowed.");
        return res.redirect("/usem");
      }
    }

    // Insert new user into the database
    await tthPool.query(
      `INSERT INTO users (first_name, last_name, email, phone, password, role, password_length)
      VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        value.firstname,
        value.lastname,
        value.email,
        value.phone,
        hashedPassword,
        value.role,
        passwordLenght,
      ]
    );

    // Send confirmation email using Nodemailer
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "davemarlon74@gmail.com",
        pass: "dumq vrzc llvo wlug",
      },
    });

    const mailOptions = {
      from: "davemarlon74@gmail.com",
      to: value.email,
      subject: "Account Registered",
      text: `Hello ${value.firstname},\n\nWelcome to our system! We're excited to have you on board. If you have any questions or need assistance, feel free to reach out.\n\nBest regards,\nThe Team`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending email: ", error);
        req.flash(
          "error",
          "Error sending confirmation email. Please try again."
        );
        return res.redirect("/usem");
      } else {
        console.log("Email sent: " + info.response);
      }
    });

    req.flash("success", "Account created successfully. Please log in.");
    return res.redirect("/usem");
  } catch (err) {
    console.error("Error: ", err);
    req.flash("error", "Internal Server Error. Please try again.");
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
