// controllers/userController.js
const tthPool = require("../models/tthDB"); // Assuming tthDB is a connection pool to your database

// Display user profile information
exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.session.userId; // Assuming you store the user ID in the session
    const result = await tthPool.query("SELECT * FROM users WHERE user_id = $1", [userId]);
    const user = result.rows[0];
    res.render("user", { user });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).send("Error fetching user profile");
  }
};

// Edit user profile
exports.editUserProfile = async (req, res) => {
  const { firstName, lastName, contactNo } = req.body;
  const userId = req.session.userId;
  try {
    await tthPool.query(
      "UPDATE users SET first_name = $1, last_name = $2, phone = $3 WHERE user_id = $4",
      [firstName, lastName, contactNo, userId]
    );
    res.redirect("/user");
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).send("Error updating profile");
  }
};

// Change email
exports.changeEmail = async (req, res) => {
  const { newEmail } = req.body;
  const userId = req.session.userId;
  try {
    await tthPool.query("UPDATE users SET email = $1 WHERE user_id = $2", [newEmail, userId]);
    res.redirect("/user");
  } catch (error) {
    console.error("Error changing email:", error);
    res.status(500).send("Error changing email");
  }
};

// Change password
exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.session.userId;
  try {
    const result = await tthPool.query("SELECT password FROM users WHERE id = $1", [userId]);
    const user = result.rows[0];
    if (user.password === currentPassword) { // This should use bcrypt for hashed passwords
      await tthPool.query("UPDATE users SET password = $1 WHERE id = $2", [newPassword, userId]);
      res.redirect("/user");
    } else {
      res.status(400).send("Current password is incorrect");
    }
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).send("Error changing password");
  }
};

// Logout
exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error logging out:", err);
      res.status(500).send("Error logging out");
    } else {
      res.redirect("/login");
    }
  });
};
