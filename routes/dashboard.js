const express = require("express");
const router = express.Router();
const tthPool = require("../models/tthDB");
const passport = require("passport");
const { ensureAuthenticated } = require("../middleware/middleware");

// Dashboard route
router.get("/dashboard", ensureAuthenticated, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const isAjax = req.query.ajax === "true";

  const currentDateTime = new Date();

  try {
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
    } = await fetchInventoryList(page, limit);

    if (isAjax) {
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
      });
    }

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
    });
  } catch (err) {
    console.error("Error: ", err);
    res.sendStatus(500);
  }
});

router.get("/dashboard/api/data", ensureAuthenticated, async (req, res) => {
  const category = req.query.category;

  try {
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
      case "Agricultural and Forestry Equipment":
        query = `
          SELECT uacs_code, COUNT(*) as count
          FROM property_acknowledgement_receipt
          WHERE uacs_code ILIKE '%Agricultural and Forestry Equipment%'
          GROUP BY uacs_code`;
        break;
      case "Medical Equipment":
        query = `
          SELECT uacs_code, COUNT(*) as count
          FROM property_acknowledgement_receipt
          WHERE uacs_code ILIKE '%Medical Equipment%'
          GROUP BY uacs_code`;
        break;
      case "Printing Equipment":
        query = `
          SELECT uacs_code, COUNT(*) as count
          FROM property_acknowledgement_receipt
          WHERE uacs_code ILIKE '%Printing Equipment%'
          GROUP BY uacs_code`;
        break;
      case "Technical and Scientific Equipment":
        query = `
          SELECT uacs_code, COUNT(*) as count
          FROM property_acknowledgement_receipt
          WHERE uacs_code ILIKE '%Technical and Scientific Equipment%'
          GROUP BY uacs_code`;
        break;
      case "Other Machinery and Equipment":
        query = `
          SELECT uacs_code, COUNT(*) as count
          FROM property_acknowledgement_receipt
          WHERE uacs_code ILIKE '%Other Machinery and Equipment%'
          GROUP BY uacs_code`;
        break;
      case "Motor Vehicles":
        query = `
          SELECT uacs_code, COUNT(*) as count
          FROM property_acknowledgement_receipt
          WHERE uacs_code ILIKE '%Motor Vehicles%'
          GROUP BY uacs_code`;
        break;
      case "Furniture and Fixtures":
        query = `
          SELECT uacs_code, COUNT(*) as count
          FROM property_acknowledgement_receipt
          WHERE uacs_code ILIKE '%Furniture and Fixtures%'
          GROUP BY uacs_code`;
        break;
      case "Books":
        query = `
          SELECT uacs_code, COUNT(*) as count
          FROM property_acknowledgement_receipt
          WHERE uacs_code ILIKE '%Books%'
          GROUP BY uacs_code`;
        break;
      case "Software":
        query = `
          SELECT uacs_code, COUNT(*) as count
          FROM property_acknowledgement_receipt
          WHERE uacs_code ILIKE '%Software%'
          GROUP BY uacs_code`;
        break;
      case "Machinery":
        query = `
          SELECT uacs_code, COUNT(*) as count
          FROM property_acknowledgement_receipt
          WHERE uacs_code ILIKE '%Machinery%'
          GROUP BY uacs_code`;
        break;
      default:
        throw new Error("Invalid category");
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

async function fetchInventoryList(page, limit) {
  const offset = (page - 1) * limit;

  try {
    const query = `
        SELECT *, COUNT(*) OVER() AS total_count
        FROM property_acknowledgement_receipt
        ORDER BY id
        LIMIT $1 OFFSET $2
      `;

    const { rows } = await tthPool.query(query, [limit, offset]);

    const totalItems = rows.length > 0 ? rows[0].total_count : 10;
    const totalPages = Math.ceil(totalItems / limit);

    const data = rows.map((row) => ({
      ...row,
    }));

    // --------------------------
    const query1 = `SELECT * FROM property_acknowledgement_receipt 
    WHERE uacs_code ILIKE $1`;

    const { rows: officeEquipment } = await tthPool.query(query1, [
      "%Office Equipment%",
    ]);
    const totalItemsOffice = officeEquipment.length;
    // -------------------------

    // --------------------------
    const query2 = `SELECT * FROM property_acknowledgement_receipt 
    WHERE uacs_code ILIKE $1`;

    const { rows: ICTEquipment } = await tthPool.query(query2, [
      "%Information and Communication Technology Equipment%",
    ]);
    const totalItemsICTEquipment = ICTEquipment.length;
    // -------------------------

    // --------------------------
    const query3 = `SELECT * FROM property_acknowledgement_receipt 
    WHERE uacs_code ILIKE $1`;

    const { rows: AgriEquipment } = await tthPool.query(query3, [
      "%Agricultural Equipment%",
    ]);
    const totalItemsAgriEquipment = AgriEquipment.length;
    // -------------------------

    // --------------------------
    const query4 = `SELECT * FROM property_acknowledgement_receipt 
    WHERE uacs_code ILIKE $1`;

    const { rows: MedEquipment } = await tthPool.query(query4, [
      "%Medical Equipment%",
    ]);
    const totalItemsMedEquipment = MedEquipment.length;
    // -------------------------

    // --------------------------
    const query5 = `SELECT * FROM property_acknowledgement_receipt 
    WHERE uacs_code ILIKE $1`;

    const { rows: PrintEquipment } = await tthPool.query(query5, [
      "%Printing Equipment%",
    ]);
    const totalItemsPrintEquipment = PrintEquipment.length;
    // -------------------------

    // --------------------------
    const query6 = `SELECT * FROM property_acknowledgement_receipt 
    WHERE uacs_code ILIKE $1`;

    const { rows: TSEquipment } = await tthPool.query(query6, [
      "%Technical and Scientific Equipment%",
    ]);
    const totalItemsTSEquipment = TSEquipment.length;
    // -------------------------

    // --------------------------
    const query7 = `SELECT * FROM property_acknowledgement_receipt 
    WHERE uacs_code ILIKE $1`;

    const { rows: OMEquipment } = await tthPool.query(query7, [
      "%Other Machineries and Equipment Equipment%",
    ]);
    const totalItemsOMEquipment = OMEquipment.length;
    // -------------------------

    // --------------------------
    const query8 = `SELECT * FROM property_acknowledgement_receipt 
    WHERE uacs_code ILIKE $1`;

    const { rows: MotorVehicles } = await tthPool.query(query8, [
      "%MotorVehicles%",
    ]);
    const totalMotorVehicles = MotorVehicles.length;
    // -------------------------

    // --------------------------
    const query9 = `SELECT * FROM property_acknowledgement_receipt 
    WHERE uacs_code ILIKE $1`;

    const { rows: FurnitureEquipment } = await tthPool.query(query9, [
      "%Furniture and Fixtures%",
    ]);
    const totalFurnitureEquipment = FurnitureEquipment.length;
    // -------------------------

    // --------------------------
    const query10 = `SELECT * FROM property_acknowledgement_receipt 
    WHERE uacs_code ILIKE $1`;

    const { rows: Books } = await tthPool.query(query10, ["%Books%"]);
    const totalBooks = Books.length;
    // -------------------------

    // --------------------------
    const query11 = `SELECT * FROM property_acknowledgement_receipt 
    WHERE uacs_code ILIKE $1`;

    const { rows: Software } = await tthPool.query(query11, ["%Software%"]);
    const totalSoftware = Software.length;
    // -------------------------

    // --------------------------
    const query12 = `SELECT * FROM property_acknowledgement_receipt 
    WHERE uacs_code ILIKE $1`;

    const { rows: MachineryEquipment } = await tthPool.query(query12, [
      "%Software%",
    ]);
    const totalMachineryEquipment = MachineryEquipment.length;
    // -------------------------

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
    };
  } catch (err) {
    console.error("Error: ", err);
    throw new Error("Error fetching inventory list");
  }
}

module.exports = router;
