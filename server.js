const express = require("express");
const app = express();
require("dotenv").config();
const path = require("path");
const passport = require("passport");
const cors = require("cors");
const session = require("express-session");
const flash = require("express-flash");
const compression = require("compression");
const initializePassport = require("./passportConfig");
const bodyParser = require("body-parser");
const { SerialPort } = require("serialport");
const WebSocket = require("ws");
const http = require("http");
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const moment = require("moment");

let rfidData = new Set(); // Using Set for O(1) lookups
let counter = 0;

// RFID Software Connection Parameters
const SERIAL_PORT = "COM3";
const BAUD_RATE = 9600;

// Initialize Serial Port
const serialPort = new SerialPort({
  path: SERIAL_PORT,
  baudRate: BAUD_RATE,
  dataBits: 8,
  parity: "none",
  stopBits: 1,
  flowControl: false,
  autoOpen: true,
});

// Independent Counter Logic
setInterval(() => {
  counter++;
  console.log(`Counter: ${counter}`);
}, 1000); // Increment the counter every 1 second

// Process RFID Data Every 10 Seconds
setInterval(() => {
  console.log("10 seconds elapsed. Proceeding to process RFID data...");
  processRFIDData();
}, 10000); // Trigger processing every 10 seconds

// Handle Incoming RFID Data
serialPort.on("data", async (data) => {
  const currentTime = Date.now();

  // Process the incoming data
  const parsed = parseRFIDHexData(data.toString("hex"), currentTime);
  if (parsed) {
    console.log("Parsed Data:", parsed);

    // Add the parsed.epc to the Set (automatically handles duplicates)
    if (!rfidData.has(parsed.epc)) {
      rfidData.add(parsed.epc);
      console.log(`Added EPC to set: ${parsed.epc}`);
    } else {
      console.log(`EPC already exists in set: ${parsed.epc}`);
    }

    // Broadcast to WebSocket clients
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(parsed)); // Send parsed data
      }
    });
  } else {
    console.log("Could not parse data.");
  }
});

serialPort.on("data", async (data) => {
  const currentTime = Date.now();

  // Parse the incoming RFID data
  const parsed = parseRFIDHexData(data, currentTime);

  if (parsed) {
    console.log("Parsed Data:", parsed);

    const client = await tthPool.connect();
    try {
      // Start a database transaction
      await client.query("BEGIN");

      // Check if the `tag_id` exists in `rfid_tags`
      const tagResult = await client.query(
        `SELECT tag_id, status FROM rfid_tags WHERE tag_id = $1`,
        [parsed.epc]
      );

      if (tagResult.rowCount > 0) {
        // If the tag exists, update its status and insert a log entry
        const tagInfo = tagResult.rows[0];

        // Update status only if it has changed
        if (!tagInfo.status) {
          await client.query(
            `
            UPDATE rfid_tags 
            SET status = true, time = $2 
            WHERE tag_id = $1
            `,
            [parsed.epc, parsed.timestamp]
          );

          console.log(`Updated tag_id ${parsed.epc} to "In"`);
        }

        // Insert log entry for this scan
        await client.query(
          `
          INSERT INTO rfid_logs (tag_id, status, time) 
          VALUES ($1, $2, $3)
          `,
          [parsed.epc, true, parsed.timestamp]
        );

        console.log(`Log entry added for tag_id ${parsed.epc}`);
      } else {
        // If the tag does not exist in rfid_tags, insert a log with "Not Registered"
        await client.query(
          `
          INSERT INTO rfid_logs (tag_id, status, time) 
          VALUES ($1, $2, $3)
          `,
          [parsed.epc, false, parsed.timestamp]
        );

        console.log(`Tag ID ${parsed.epc} not registered. Log entry added.`);
      }

      // Commit the transaction
      await client.query("COMMIT");
    } catch (error) {
      // Rollback the transaction on error
      await client.query("ROLLBACK");
      console.error("Error handling RFID data:", error.message);
    } finally {
      // Release the database client
      client.release();
    }

    // Broadcast the parsed data to WebSocket clients
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(parsed)); // Send parsed data
      }
    });
  } else {
    console.log("Could not parse data.");
  }
});

// Function to Process RFID Data
async function processRFIDData() {
  const client = await tthPool.connect();
  try {
    console.log("Processing RFID data...");

    await client.query("BEGIN"); // Start transaction

    // Fetch all tag_ids and their current statuses
    const allTagsResult = await client.query(
      `SELECT tag_id, status, time FROM rfid_tags`
    );
    const allTags = allTagsResult.rows;

    // Create a Map for quick lookup
    const tagStatusMap = new Map();
    allTags.forEach((tag) => {
      tagStatusMap.set(tag.tag_id, {
        status: tag.status,
        time: tag.time,
      });
    });

    console.log("all tags:", allTags);

    // Current "In" Tags from RFID Data
    const currentInTags = new Set(rfidData.keys());

    // All Tag IDs from Database
    const allTagIds = new Set(tagStatusMap.keys());

    // Determine Tags to Set "Out" (Present in DB but not in current RFID data)
    const tagsToSetOut = new Set(
      [...allTagIds].filter((tagId) => !currentInTags.has(tagId))
    );

    // Arrays to hold tags that need status updates
    const tagsToSetIn = [];
    const logsToInsertIn = [];
    const tagsToSetOutList = [];
    const logsToInsertOut = [];

    // Determine which tags need to be set to "In"
    for (const [epc, timestamp] of rfidData.entries()) {
      console.log("In determined!!");
      const tagInfo = tagStatusMap.get(epc);
      if (tagInfo) {
        if (!tagInfo.status) {
          // If currently "Out", set to "In"
          tagsToSetIn.push(epc);
          logsToInsertIn.push({ tag_id: epc, status: true, timestamp });
        }
      } else {
        console.log(
          `No record found for tag_id: ${epc}. Consider adding it to rfid_tags.`
        );
        // Optionally, handle new tags by inserting them into rfid_tags
        // Example:
        // await client.query(
        //   `INSERT INTO rfid_tags (tag_id, assigned_item, status) VALUES ($1, $2, $3)`,
        //   [epc, 'Assigned Item Name', true]
        // );
        // logsToInsertIn.push({ tag_id: epc, status: true, timestamp });
      }
    }

    // Determine which tags need to be set to "Out"
    for (const tagId of tagsToSetOut) {
      console.log("Out determined!!");
      const tagInfo = tagStatusMap.get(tagId);
      if (tagInfo.status) {
        // If currently "In", set to "Out"
        tagsToSetOutList.push(tagId);
        logsToInsertOut.push({
          tag_id: tagId,
          status: false,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Batch Update Tags to "In"
    if (tagsToSetIn.length > 0) {
      console.log("In batch update!!");
      const inQuery = `
        UPDATE rfid_tags 
        SET status = true, time = $2 
        WHERE tag_id = ANY($1::varchar[])
      `;
      const inTimestamps = tagsToSetIn.map(
        (epc) => logsToInsertIn.find((log) => log.tag_id === epc).timestamp
      );

      // Assuming all updates share the same timestamp; otherwise, loop through individually
      const uniqueTimestamps = new Set(inTimestamps);
      for (const timestamp of uniqueTimestamps) {
        const epcs = tagsToSetIn.filter(
          (epc) =>
            logsToInsertIn.find((log) => log.tag_id === epc).timestamp ===
            timestamp
        );
        await client.query(inQuery, [epcs, timestamp]);
        console.log(
          `Status updated to 'In' for tag_ids: ${epcs.join(
            ", "
          )} at ${timestamp}`
        );
      }

      // Insert Logs for "In" Status Changes
      const insertLogsInQuery = `
        INSERT INTO rfid_logs (tag_id, status, time) 
        VALUES ($1, $2, $3)
      `;
      for (const log of logsToInsertIn) {
        await client.query(insertLogsInQuery, [
          log.tag_id,
          log.status,
          log.timestamp,
        ]);
        console.log(
          `Log inserted for tag_id: ${log.tag_id}, Status: In, Timestamp: ${log.timestamp}`
        );
      }
    } else {
      console.log("No tags to update to 'In'.");
    }

    // Batch Update Tags to "Out"
    if (tagsToSetOutList.length > 0) {
      console.log("Out batch update!!");
      const outQuery = `
        UPDATE rfid_tags 
        SET status = false, time = $2 
        WHERE tag_id = ANY($1::varchar[])
      `;
      const outTimestamp = new Date().toISOString(); // Use current time for "Out" status

      await client.query(outQuery, [
        Array.from(tagsToSetOutList),
        outTimestamp,
      ]);
      console.log(
        `Status updated to 'Out' for tag_ids: ${Array.from(
          tagsToSetOutList
        ).join(", ")} at ${outTimestamp}`
      );

      // Insert Logs for "Out" Status Changes
      const insertLogsOutQuery = `
        INSERT INTO rfid_logs (tag_id, status, time) 
        VALUES ($1, $2, $3)
      `;
      for (const log of logsToInsertOut) {
        await client.query(insertLogsOutQuery, [
          log.tag_id,
          log.status,
          log.timestamp,
        ]);
        console.log(
          `Log inserted for tag_id: ${log.tag_id}, Status: Out, Timestamp: ${log.timestamp}`
        );
        // TODO: Implement email notification here
      }
    } else {
      console.log("No tags to update to 'Out'.");
    }

    await client.query("COMMIT"); // Commit transaction
    console.log("Data processing completed. Resetting RFID data map.");

    // Reset the RFID data map for the next interval
    rfidData.clear();
  } catch (error) {
    await client.query("ROLLBACK"); // Rollback transaction on error
    console.error("Error processing RFID data:", error.message);
  } finally {
    client.release(); // Release the client back to the pool
  }
}

serialPort.on("error", (err) => {
  console.error(`Serial port error: ${err.message}`);
});

wss.on("connection", (ws) => {
  console.log("WebSocket client connected");
  ws.send("Connected to WebSocket server");
});

// Function to Parse RFID Hex Data
function parseRFIDHexData(data, currentTime) {
  try {
    const hexString = data.toString("hex"); // Convert buffer to hex string
    console.log(`Hex data: ${hexString}`);

    if (hexString.startsWith("ccffff")) {
      const pc = hexString.slice(14, 18); // Example: Protocol Control
      const epc = hexString.slice(18, 42); // Example: EPC (24 hex characters)
      const rssi = parseInt(hexString.slice(42, 46), 16); // Example: RSSI in hexadecimal

      // Add the current timestamp
      const timestamp = new Date(currentTime).toISOString();

      return {
        pc: pc.toUpperCase(),
        epc: epc.toUpperCase(),
        rssi: `${rssi}dBm`,
        timestamp: timestamp, // Include the timestamp in the parsed data
      };
    } else {
      console.log("Invalid header or unsupported data format.");
      return null;
    }
  } catch (err) {
    console.error("Error parsing hex data:", err);
    return null;
  }
}

const {
  checkNotAuthenticated,
  ensureAuthenticated,
} = require("./middleware/middleware");

//-------DATABASES IMPORTING-------//
const tthPool = require("./models/tthDB");

//-------ROUTES--------//
const signupRoutes = require("./routes/signup");
const loginRoutes = require("./routes/login");
const dashboardRoutes = require("./routes/dashboard");
const userRoutes = require("./routes/user");
const parRoutes = require("./routes/par");
const ptrRoutes = require("./routes/ptr");
const icsRoutes = require("./routes/ics");
const inventoryRoutes = require("./routes/inventory");
const addItemRoutes = require("./routes/add-item");
const notifRoutes = require("./Routes/notif");
const prsRoutes = require("./Routes/prs");
const mrerRoutes = require("./Routes/mrer");
const wmrfRoutes = require("./routes/wmrf");
const rfidRoutes = require("./Routes/rfid");

//-------CONNECTING TO DATABASE-------//
tthPool
  .connect()
  .then(() => console.log("Connected to TTH database"))
  .catch((err) => console.error("Error connecting to TTH database:", err));

initializePassport(passport);

//-------INITIALIZING VIEW ENGINE AND PATH------//
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use("/node_modules", express.static(path.join(__dirname, "node_modules")));

app.use(compression());
app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));
app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// Middleware to prevent cache on page
app.use((req, res, next) => {
  res.header("Cache-Control", "private, no-cache, no-store, must-revalidate");
  res.header("Expires", "-1");
  res.header("Pragma", "no-cache");
  next();
});

// =========================
//      LANDING ROUTE
// =========================
app.get("/", (req, res) => {
  // Render landing.ejs (make sure you have this file in /views)
  res.render("landing");
});

// app.get("/rfid-data", (req, res) => {
//   res.render("rfid-data", { rfidData }); // Pass the data to the EJS page
// });

app.get("/clear-data", (req, res) => {
  rfidData = []; // Clear the array
  res.redirect("/rfid-data"); // Redirect to the data page
});

//------INITIALIZE ROUTES------//
app.use("/", signupRoutes);
app.use("/", loginRoutes);
app.use("/", dashboardRoutes);
app.use("/", userRoutes);
app.use("/ics", icsRoutes);
app.use("/par", parRoutes);
app.use("/ptr", ptrRoutes);
app.use("/Inventory", inventoryRoutes);
app.use("/add-item", addItemRoutes);
app.use("/notif", notifRoutes);
app.use("/prs", prsRoutes);
app.use("/mrer", mrerRoutes);
app.use("/wmrf", wmrfRoutes);
app.use("/rfid", rfidRoutes);

// Logout route to clear session
app.get("/logout", (req, res, next) => {
  req.logOut((err) => {
    if (err) {
      return next(err);
    }
    req.session.destroy((err) => {
      if (err) {
        return next(err);
      }
      res.redirect("/login");
    });
  });
});

app.get("/dashboard", ensureAuthenticated, (req, res) => {
  const currentDateTime = new Date(); // Get the current date and time
  res.render("dashboard", { currentDateTime }); // Pass the date and time to the template
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

// Start server with error handling for port in use
app.listen(process.env.PORT, () => {
  console.log(`Server is up and running on port ${process.env.PORT}`);
});

app.get("/print-inv", (req, res) => {
  res.render("printttt");
});
