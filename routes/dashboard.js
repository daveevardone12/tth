const express = require("express");
const router = express.Router();
const tthPool = require("../models/tthDB");

// Middleware to check if user is authenticated (optional)
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect("/login");
};

// Dashboard route
router.get("/", isAuthenticated, async (req, res) => {
    try {
        // Example: Fetch data for the dashboard (replace with your actual queries)
        const results = await tthPool.query(`SELECT * FROM your_table_name`);

        // Render the dashboard view with the fetched data
        res.render("dashboard", { data: results.rows });
    } catch (err) {
        console.error("Error fetching data for dashboard:", err);
        res.status(500).send("Internal Server Error");
    }
});

// You can add more routes here related to the dashboard, like:
router.get("/api/data", isAuthenticated, async (req, res) => {
    try {
        // Fetch specific data from the database
        const results = await tthPool.query(`SELECT * FROM your_table_name`);
        res.json(results.rows);
    } catch (err) {
        console.error("Error fetching API data:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;
