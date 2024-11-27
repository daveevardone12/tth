const express = require('express');
const router = express.Router();
const tthPool = require('../models/tthDB');
const { ensureAuthenticated } = require("../middleware/middleware");

// Get route to render the ICS page, with session user check
router.get("/", ensureAuthenticated, (req, res) => {
    
    res.render("ics");
});

// Post route to save data to the database
router.post('/save', async (req, res) => {
    const data = req.body;
    console.log(data);

    try {
        await tthPool.query(
            `INSERT INTO inventory_custodian_slip 
            (item_name, accountable, unit_cost, date_acquired, location, category, uacs_code, inventory_item_no, burs_no, estimated_useful_life, po_no, code, iar, supplier, serial_no, property_no, rfid_code, description) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
            [
                data.itemName,        // Matches "itemName" field in ejs
                data.accountable,     // Matches "accountable" field in ejs
                data.cost,            // Matches "cost" field in ejs
                data.dateAcquired,    // Matches "dateAcquired" field in ejs
                data.location,        // Matches "location" field in ejs
                data.category,        // Matches "category" field in ejs
                data.uacs,            // Matches "uacs" field in ejs
                data.inventoryNo,     // Matches "inventoryNo" field in ejs
                data.burs,            // Matches "burs" field in ejs
                data.life,            // Matches "life" field in ejs
                data.po,              // Matches "po" field in ejs
                data.code,            // Matches "code" field in ejs
                data.iar,             // Matches "iar" field in ejs
                data.supplier,        // Matches "supplier" field in ejs
                data.serial,          // Matches "serial" field in ejs
                data.propertyNo,      // Matches "propertyNo" field in ejs
                data.rfid,            // Matches "rfid" field in ejs
                data.description      // Matches "description" field in ejs
            ]
        );
        req.flash("success", "Saved successfully.");
        return res.redirect("/ics");
    } catch (error) {
        console.error("Error:", error);
        req.flash("error", "An error occurred while processing the request.");
        return res.redirect("/ics");
    }
});

module.exports = router;
