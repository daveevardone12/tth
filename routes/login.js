const express = require("express");
const router = express.Router();
const Joi = require("joi");
const bcrypt = require("bcrypt");
const tthPool = require("../models/tthDB");

const userSchema = Joi.object({
  role: Joi.string().required(),
  email: Joi.string().required(),
  password: Joi.string().required(),
});

// Login route
router.post("/login/submit", async (req, res, next) => {
  const { error, value } = userSchema.validate(req.body);

  if (error) {
    req.flash("error", error.details[0].message);
    return res.redirect("/login");
  }

  try {
    const userCheck = await tthPool.query(
      "SELECT * FROM users WHERE email = $1",
      [value.email]
    );

    if (userCheck.rows.length === 0) {
      req.flash("error", "Invalid email or password");
      return res.redirect("/login");
    }

    const user = userCheck.rows[0];
    const validPassword = await bcrypt.compare(value.password, user.password);

    if (!validPassword) {
      req.flash("error", "Invalid email or password");
      return res.redirect("/login");
    }

    if (user.role !== value.role) {
      req.flash("error", "Invalid role for the user");
      return res.redirect("/login");
    }

    // Set session data
    req.session.user = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    req.flash("success", `${user.role.charAt(0).toUpperCase() + user.role.slice(1)} login successful`);
    return res.redirect("/dashboard");
  } catch (err) {
    console.error("Error: ", err);
    res.status(500).send("Internal server error");
  }
});

module.exports = router;
  