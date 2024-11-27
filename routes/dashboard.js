const express = require("express");
const router = express.Router();
const tthPool = require("../models/tthDB");
const passport = require("passport");
const { ensureAuthenticated } = require("../middleware/middleware");

// Dashboard route
router.get("/dashboard", ensureAuthenticated, async (req, res) => {
    console.log("dashboard!");
    try {
        // Example: Fetch data for the dashboard (replace with your actual queries)
        const results = await tthPool.query(`SELECT * FROM users`);

        // Render the dashboard view with the fetched data
        res.render("dashboard", { data: results.rows });
    } catch (err) {
        console.error("Error fetching data for dashboard:", err);
        res.status(500).send("Internal Server Error");
    }
});

// You can add more routes here related to the dashboard, like:
router.get("/api/data", async (req, res) => {
    try {
        // Fetch specific data from the database
        const results = await tthPool.query(`SELECT * FROM users`);
        res.json(results.rows);
    } catch (err) {
        console.error("Error fetching API data:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;
