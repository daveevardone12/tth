const express = require("express");
const router = express.Router();
const Joi = require("joi");
const bcrypt = require("bcrypt");
const tthPool = require("../models/tthDB");
const { checkNotAuthenticated } = require("../middleware/middleware");
const passport = require("passport");

const userSchema = Joi.object({
  role: Joi.string().required(),
  email: Joi.string().required(),
  password: Joi.string().required(),
});

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
      console.log("Authentication failed:", info?.message || "Invalid credentials");
      req.flash("error", info?.message || "Invalid credentials");
      return res.redirect("/login");
    }

    req.login(user, (err) => {
      if (err) {
        console.error("Login error:", err);
        return next(err);
      }

      // Log user role and proceed accordingly
      console.log("Authenticated user role:", user.role);
      switch (user.role) {
        case "admin":
          return res.redirect("/dashboard");
        case "user":
          return res.redirect("/dashboard");
        default:
          req.flash("error", "Invalid user role");
          return res.redirect("/login");
      }
    });
  })(req, res, next);
});



module.exports = router;
