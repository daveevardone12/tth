const express = require("express");
const router = express.Router();
const Joi = require("joi");
const bcrypt = require("bcrypt");
const passport = require("passport");
const { ensureAuthenticated } = require("../middleware/middleware"); // Import middleware
const pool = require("../models/tthDB"); // Ensure pool is imported

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

// Modify role endpoint
router.post("/modify-role", async (req, res) => {
  try {
    const { newRole, userId } = req.body;

    if (!userId || !newRole) {
      return res.status(400).json({ error: "User ID and role are required." });
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

module.exports = router;
