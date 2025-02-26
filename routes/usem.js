const express = require("express");
const router = express.Router();
const Joi = require("joi");
const bcrypt = require("bcrypt");
const tthPool = require("../models/tthDB");
const passport = require("passport");
const { ensureAuthenticated } = require("../middleware/middleware"); // Import middleware
const pool = require("../models/tthDB"); // Ensure pool is imported

router.get("/", ensureAuthenticated, async (req, res) => {
  const success = req.query.success === "true";
  const userData = req.user;
  const role = userData.role;

  try {
    const result = await pool.query(
      `SELECT first_name, last_name, email, phone, role, 
              COALESCE(status, 'Inactive') AS status,
              TO_CHAR(last_login, 'MM/DD/YYYY HH12:MI AM') AS last_login 
       FROM users`
    );

    const users = result.rows.map((user) => ({
      ...user,
      full_name: `${user.first_name} ${user.last_name}`,
      last_login: user.last_login || "Never", // Show 'Never' if NULL
    }));

    res.render("usem", { success, role, users });
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).send("Error fetching users");
  }
});

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

module.exports = router;
