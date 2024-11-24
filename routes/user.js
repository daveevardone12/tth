const express = require('express');
const router = express.Router();
const tthPool = require('../models/tthDB');

// Route to render user profile page
router.get('/user', (req, res) => {
    const userId = req.session.user;
    console.log(userId);
    if (!userId) {
        console.log("No userId in session. Redirecting to login.");
        return res.redirect('/login');  // Redirect if no user is logged in
    }

    // Fetch user data from the database
    tthPool.query('SELECT first_name, last_name, email, contact_number FROM users WHERE id = $1', [userId], (err, result) => {
        if (err) {
            console.error("Error fetching user data:", err);
            return res.status(500).send("Internal Server Error");
        }

        const user = result.rows[0];
        if (!user) {
            console.log("User not found in database");
            return res.status(404).send("User not found");
        }

        // Render the user profile page with user data
        res.render('user', { user });
    });
});

// Route to handle updating user profile data
router.post('/user/update', (req, res) => {
    const { first_name, last_name, contact_number, email } = req.body;
    const userId = req.session.userId;

    if (!userId) {
        console.log("No userId in session. Redirecting to login.");
        return res.redirect('/login');  // Redirect if no user is logged in
    }

    // Update user data in the database
    tthPool.query(
        'UPDATE users SET first_name = $1, last_name = $2, contact_number = $3, email = $4 WHERE id = $5',
        [first_name, last_name, contact_number, email, userId],
        (err, result) => {
            if (err) {
                console.error("Error updating user data:", err);
                return res.status(500).send("Internal Server Error");
            }

            // After update, redirect back to the profile page
            res.redirect('/user');
        }
    );
});


module.exports = router;
