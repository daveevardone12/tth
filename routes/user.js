const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require("../middleware/middleware");

// Logout Route
router.get("/logout", (req, res) => {
    // Destroy the session to log out the user
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        // Redirect to login page after logging out
        res.redirect("/login");  // Update this URL as needed for your app
    });
}); 

// Get route to render the user page, with session user check
router.get("/user", ensureAuthenticated, (req, res) => {
    res.render("user");
});

module.exports = router;
