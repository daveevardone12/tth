// routes/dashboard.js

const express = require("express");
const router = express.Router();
const tthPool = require("../models/tthDB");
const passport = require("passport");
const { ensureAuthenticated } = require("../middleware/middleware");

// Dashboard route
router.get("/dashboard", ensureAuthenticated, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const ajaxType = req.query.ajax; // Can be 'true' or 'locations'
  const location = req.query.location || null; // Optional location filter

  const currentDateTime = new Date();
  const userData = req.user;
  const role = userData.role;
  try {
    if (ajaxType === "true") {
      // Handle Inventory Data AJAX Request
      const {
        getInventoryList,
        totalPages,
        totalItemsOffice,
        totalItemsICTEquipment,
        totalItemsAgriEquipment,
        totalItemsMedEquipment,
        totalItemsPrintEquipment,
        totalItemsTSEquipment,
        totalItemsOMEquipment,
        totalMotorVehicles,
        totalFurnitureEquipment,
        totalBooks,
        totalSoftware,
        totalMachineryEquipment,
        totalMarineandMachineryEquipment,
        totalCommunicationEquipment,
        totalDisasterResponseandRescueEquipment,
        totalMilitaryPoliceandSecurityEquipment,
        totalSportsEquipment,
      } = await fetchInventoryList(page, limit, location);

      return res.json({
        getInventoryList,
        currentPage: page,
        totalPages,
        limit,
        currentDateTime,
        totalItemsOffice,
        totalItemsICTEquipment,
        totalItemsAgriEquipment,
        totalItemsMedEquipment,
        totalItemsPrintEquipment,
        totalItemsTSEquipment,
        totalItemsOMEquipment,
        totalMotorVehicles,
        totalFurnitureEquipment,
        totalBooks,
        totalSoftware,
        totalMachineryEquipment,
        totalMarineandMachineryEquipment,
        totalCommunicationEquipment,
        totalDisasterResponseandRescueEquipment,
        totalMilitaryPoliceandSecurityEquipment,
        totalSportsEquipment,
      });
    } else if (ajaxType === "locations") {
      // Handle Location-Based Data AJAX Request
      const locationData = await fetchLocationData(location);

      return res.json({
        locationData,
      });
    } else {
      // Render Full Dashboard Page
      const {
        getInventoryList,
        totalPages,
        totalItemsOffice,
        totalItemsICTEquipment,
        totalItemsAgriEquipment,
        totalItemsMedEquipment,
        totalItemsPrintEquipment,
        totalItemsTSEquipment,
        totalItemsOMEquipment,
        totalMotorVehicles,
        totalFurnitureEquipment,
        totalBooks,
        totalSoftware,
        totalMachineryEquipment,
        totalMarineandMachineryEquipment,
        totalCommunicationEquipment,
        totalDisasterResponseandRescueEquipment,
        totalMilitaryPoliceandSecurityEquipment,
        totalSportsEquipment,
      } = await fetchInventoryList(page, limit, location);

      res.render("dashboard", {
        getInventoryList,
        currentPage: page,
        totalPages,
        limit,
        currentDateTime,
        totalItemsOffice,
        totalItemsICTEquipment,
        totalItemsAgriEquipment,
        totalItemsMedEquipment,
        totalItemsPrintEquipment,
        totalItemsTSEquipment,
        totalItemsOMEquipment,
        totalMotorVehicles,
        totalFurnitureEquipment,
        totalBooks,
        totalSoftware,
        totalMachineryEquipment,
        totalMarineandMachineryEquipment,
        totalCommunicationEquipment,
        totalDisasterResponseandRescueEquipment,
        totalMilitaryPoliceandSecurityEquipment,
        totalSportsEquipment,
        role,
      });
    }
  } catch (err) {
    console.error("Error: ", err);
    res.sendStatus(500);
  }
});

// Function to fetch inventory list with optional location filtering
async function fetchInventoryList(page, limit, location) {
  const offset = (page - 1) * limit;

  try {
    // Base query with pagination and optional location filter
    let baseQuery = `
      SELECT *, COUNT(*) OVER() AS total_count
      FROM property_acknowledgement_receipt
      ${location ? "WHERE location = $3" : ""}
      ORDER BY id
      LIMIT $1 OFFSET $2
    `;

    // Parameters array
    let params = [limit, offset];
    if (location) {
      params.push(location);
    }

    const { rows } = await tthPool.query(baseQuery, params);

    const totalItems = rows.length > 0 ? rows[0].total_count : 0;
    const totalPages = Math.ceil(totalItems / limit);

    const data = rows.map((row) => ({
      ...row,
    }));

    // Fetch counts for each category with optional location filter
    const totalItemsOffice = await getCountByCategory(
      "%Office Equipment%",
      location
    );
    const totalItemsICTEquipment = await getCountByCategory(
      "%Information and Communication Technology Equipment%",
      location
    );
    const totalItemsAgriEquipment = await getCountByCategory(
      "%Agricultural Equipment%",
      location
    );
    const totalItemsMedEquipment = await getCountByCategory(
      "%Medical Equipment%",
      location
    );
    const totalItemsPrintEquipment = await getCountByCategory(
      "%Printing Equipment%",
      location
    );
    const totalItemsTSEquipment = await getCountByCategory(
      "%Technical and Scientific Equipment%",
      location
    );
    const totalItemsOMEquipment = await getCountByCategory(
      "%Other Machinery and Equipment%",
      location
    );
    const totalMotorVehicles = await getCountByCategory(
      "%Motor Vehicles%",
      location
    );
    const totalFurnitureEquipment = await getCountByCategory(
      "%Furniture and Fixtures%",
      location
    );
    const totalBooks = await getCountByCategory("%Books%", location);
    const totalSoftware = await getCountByCategory("%Software%", location);
    const totalMachineryEquipment = await getCountByCategory(
      "%Machinery%",
      location
    );
    const totalMarineandMachineryEquipment = await getCountByCategory(
      "%Marine and Machinery Equipment%",
      location
    );
    const totalCommunicationEquipment = await getCountByCategory(
      "%Communication Equipment%",
      location
    );
    const totalDisasterResponseandRescueEquipment = await getCountByCategory(
      "%Disaster Response and Rescue Equipment%",
      location
    );
    const totalMilitaryPoliceandSecurityEquipment = await getCountByCategory(
      "%Military Police and Security Equipment%",
      location
    );
    const totalSportsEquipment = await getCountByCategory(
      "%Sports Equipment%",
      location
    );

    return {
      getInventoryList: data,
      totalPages,
      totalItemsOffice,
      totalItemsICTEquipment,
      totalItemsAgriEquipment,
      totalItemsMedEquipment,
      totalItemsPrintEquipment,
      totalItemsTSEquipment,
      totalItemsOMEquipment,
      totalMotorVehicles,
      totalFurnitureEquipment,
      totalBooks,
      totalSoftware,
      totalMachineryEquipment,
      totalMarineandMachineryEquipment,
      totalCommunicationEquipment,
      totalDisasterResponseandRescueEquipment,
      totalMilitaryPoliceandSecurityEquipment,
      totalSportsEquipment,
    };
  } catch (err) {
    console.error("Error: ", err);
    throw new Error("Error fetching inventory list");
  }
}

// Helper function to get counts by category with optional location filtering
async function getCountByCategory(categoryPattern, location) {
  try {
    let query = `
      SELECT COUNT(DISTINCT uacs_code) as count
      FROM property_acknowledgement_receipt
      WHERE uacs_code ILIKE $1
      ${location ? "AND location = $2" : ""}
    `;
    let params = [categoryPattern];
    if (location) {
      params.push(location);
    }

    const { rows } = await tthPool.query(query, params);
    return parseInt(rows[0].count, 10);
  } catch (err) {
    console.error("Error fetching count by category:", err);
    return 0;
  }
}

// Function to fetch location-based metrics
async function fetchLocationData(location) {
  try {
    let query = "";
    let params = [];
    if (location) {
      query = `
        SELECT location, COUNT(DISTINCT uacs_code) as metric
        FROM property_acknowledgement_receipt
        WHERE location = $1
        GROUP BY location
      `;
      params = [location];
    } else {
      query = `
        SELECT location, COUNT(DISTINCT uacs_code) as metric
        FROM property_acknowledgement_receipt
        GROUP BY location
      `;
    }

    const { rows } = await tthPool.query(query, params);

    // Format data as needed for the frontend
    const locationData = rows.map((row) => ({
      location: row.location,
      metric: parseInt(row.metric, 10),
    }));

    return locationData;
  } catch (err) {
    console.error("Error fetching location data:", err);
    throw new Error("Error fetching location data");
  }
}

// API endpoint for category-based data (if needed)
router.get("/dashboard/api/data", ensureAuthenticated, async (req, res) => {
  const category = req.query.category;

  try {
    if (!category) {
      return res.status(400).json({ error: "Category is required" });
    }

    let query = "";
    switch (category) {
      case "ICT Equipment":
        query = `
          SELECT uacs_code, COUNT(*) as count
          FROM property_acknowledgement_receipt
          WHERE uacs_code ILIKE '%Information and Communication Technology Equipment%'
          GROUP BY uacs_code`;
        break;
      case "Office Equipment":
        query = `
          SELECT uacs_code, COUNT(*) as count
          FROM property_acknowledgement_receipt
          WHERE uacs_code ILIKE '%Office Equipment%'
          GROUP BY uacs_code`;
        break;
      // ... (other cases remain unchanged)
      default:
        return res.status(400).json({ error: "Invalid category" });
    }

    const { rows } = await tthPool.query(query);

    // Extract UACS codes and counts
    const uacsCodes = rows.map((row) => row.uacs_code);
    const values = rows.map((row) => row.count);

    res.json({
      uacsCodes,
      values,
    });
  } catch (err) {
    console.error("Error fetching data:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Example API route (not used in current setup)
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

// Paste this snippet at the very end of "dashboard.js", AFTER "module.exports = router;"

/**
 * SNIPPET: Override getCountByCategory to count ALL rows per category (not distinct codes).
 */

// (Optional) keep a reference to the original function if needed:
// const originalGetCountByCategory = getCountByCategory;

// Overwrite getCountByCategory with a version that uses COUNT(*).
async function getCountByCategory(categoryPattern, location) {
  try {
    let query = `
      SELECT COUNT(*) AS count
      FROM property_acknowledgement_receipt
      WHERE uacs_code ILIKE $1
      ${location ? "AND location = $2" : ""}
    `;
    let params = [categoryPattern];
    if (location) {
      params.push(location);
    }

    const { rows } = await tthPool.query(query, params);
    return parseInt(rows[0].count, 10);
  } catch (err) {
    console.error("Error fetching count by category:", err);
    return 0;
  }
}
