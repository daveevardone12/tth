const express = require("express");
const router = express.Router();
const Joi = require("joi");
const bcrypt = require("bcrypt");
const tthPool = require("../models/tthDB");
const { checkNotAuthenticated } = require("../middleware/middleware");
const passport = require("passport");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const pool = require("../models/tthDB"); // Ensure pool is imported

const userSchema = Joi.object({
  role: Joi.string().required(),
  email: Joi.string().required(),
  password: Joi.string().required(),
});

// Login Routes
router.get("/", checkNotAuthenticated, (req, res) => {
  res.render("login");
});

router.get("/login", checkNotAuthenticated, (req, res) => {
  res.render("login");
});

router.post("/login/submit", async (req, res, next) => {
  const { error, value } = userSchema.validate(req.body);

  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  passport.authenticate("local", async (err, user, info) => {
    if (err) {
      console.error("Authentication error:", err);
      return next(err);
    }

    if (!user) {
      console.log("Authentication failed: Invalid credentials");
      req.flash("error", "Invalid credentials");
      return res.redirect("/login");
    }

    // Validate role selection
    const selectedRole = req.body.role;
    if (!selectedRole || selectedRole !== user.role) {
      console.log("Role mismatch detected");
      req.flash("error", "Incorrect role selected. Please try again.");
      return res.redirect("/login");
    }

    req.login(user, async (err) => {
      if (err) {
        console.error("Login error:", err);
        return next(err);
      }

      try {
        // ✅ Update `last_login` & `status`
        await pool.query(
          "UPDATE users SET last_login = NOW(), status = 'Online' WHERE email = $1",
          [user.email]
        );
      } catch (updateErr) {
        console.error("Error updating last_login and status:", updateErr);
      }

      console.log(`Login successful for user: ${user.email}`);
      req.flash("success", "Login successful!");

      switch (user.role) {
        case "Admin":
        case "Employee":
          return res.redirect("/dashboard");
        default:
          req.flash("error", "Invalid user role");
          return res.redirect("/login");
      }
    });
  })(req, res, next);
});

router.get("/logout", (req, res) => {
  if (req.user) {
    pool
      .query("UPDATE users SET status = 'Offline' WHERE email = $1", [
        req.user.email,
      ])
      .then(() => {
        req.logout((err) => {
          if (err) {
            console.error("Logout error:", err);
            return res.status(500).send("Logout failed");
          }
          req.flash("success", "You have been logged out");
          res.redirect("/login");
        });
      })
      .catch((error) =>
        console.error("Error updating status on logout:", error)
      );
  } else {
    req.flash("error", "No active session found");
    res.redirect("/login");
  }
});

// Forgot Password Routes
router.get("/forgot-password", checkNotAuthenticated, (req, res) => {
  res.render("forgot-password");
});

router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  const userQuery = `SELECT * FROM users WHERE email = $1`;
  const userResult = await tthPool.query(userQuery, [email]);

  if (userResult.rowCount === 0) {
    req.flash("error", "No account found with that email.");
    return res.redirect("/forgot-password");
  }

  const resetToken = crypto.randomBytes(20).toString("hex");
  const resetTokenExpiry = new Date(Date.now() + 3600000).toISOString();

  const updateQuery = `
    UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE email = $3
  `;
  await tthPool.query(updateQuery, [resetToken, resetTokenExpiry, email]);

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const resetUrl = `http://${req.headers.host}/reset-password/${resetToken}`;
  console.log("Reset URL:", resetUrl);

  const mailOptions = {
    to: email,
    from: "davemarlon74@gmail.com",
    subject: "Password Reset",
    text: `You requested a password reset. Click the link below to reset your password:\n\n${resetUrl}\n\nIf you did not request this, ignore this email.`,
  };

  try {
    await transporter.sendMail(mailOptions);
    req.flash("success", "Password reset link sent to your email.");
    res.redirect("/login");
  } catch (err) {
    console.error("Error sending email:", err);
    req.flash("error", "Failed to send email. Try again later.");
    res.redirect("/forgot-password");
  }
});

// Reset Password Routes
router.get("/reset-password/:token", (req, res) => {
  const { token } = req.params;
  res.render("reset-password", { token });
});

router.post("/reset-password/:token", async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  const tokenQuery = `
    SELECT * FROM users WHERE reset_token = $1 AND reset_token_expiry > $2
  `;
  const tokenResult = await tthPool.query(tokenQuery, [
    token,
    new Date(Date.now()).toISOString(),
  ]);

  if (tokenResult.rowCount === 0) {
    req.flash("error", "Invalid or expired token.");
    return res.redirect("/forgot-password");
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const updatePasswordQuery = `
    UPDATE users SET password = $1, reset_token = NULL, reset_token_expiry = NULL WHERE reset_token = $2
  `;
  await tthPool.query(updatePasswordQuery, [hashedPassword, token]);

  req.flash("success", "Password successfully reset. You can now log in.");
  res.redirect("/login");
});

module.exports = router;
