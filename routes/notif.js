const express = require("express");
const router = express.Router();
const tthPool = require("../models/tthDB");
const { ensureAuthenticated } = require("../middleware/middleware");
require("dotenv").config();
const { SerialPort } = require("serialport");
const WebSocket = require("ws");
const http = require("http");
const server = http.createServer(router);
const wss = new WebSocket.Server({ server });
const moment = require("moment");

let rfidData = [];
const SCAN_INTERVAL = 10 * 60 * 1000;
let lastProcessedTime = Date.now();
const sentEPCs = new Set();

// RFID software connection
const SERIAL_PORT = "COM2";
const BAUD_RATE = 57600;

const serialPort = new SerialPort({
  path: SERIAL_PORT,
  baudRate: BAUD_RATE,
  dataBits: 8,
  parity: "none",
  stopBits: 1,
  flowControl: false,
  autoOpen: true,
});

serialPort.on("open", () => {
  console.log(`Serial port ${SERIAL_PORT} opened`);
});

serialPort.on("data", async (data) => {
  const currentTime = Date.now();

  // Process data immediately (or conditionally based on interval)
  const parsed = parseRFIDHexData(data.toString("hex"), currentTime);
  if (parsed) {
    console.log("Parsed Data:", parsed);
    // Add the parsed data to the global array
    rfidData.push(parsed);

    // Optional: Limit array size to avoid memory overflow
    if (rfidData.length > 100) {
      rfidData.shift(); // Remove the oldest entry
    }

    // Broadcast to WebSocket clients
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(parsed)); // Send parsed data
      }
    });

    // Update the last processed time
    lastProcessedTime = currentTime;
  } else {
    console.log("Could not parse data.");
  }
});

serialPort.on("error", (err) => {
  console.error(`Serial port error: ${err.message}`);
});

wss.on("connection", (ws) => {
  console.log("WebSocket client connected");
  ws.send("Connected to WebSocket server");
});

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

router.get("/", ensureAuthenticated, async (req, res) => {
  const success = req.query.success === "true";
  res.render("notif", { success });
});

router.get("/notif", ensureAuthenticated, async (req, res) => {
  // Filter out data that has already been sent
  const newRfidData = rfidData.filter((data) => {
    if (!sentEPCs.has(data.epc)) {
      sentEPCs.add(data.epc); // Mark this EPC as sent
      return true; // Include this data
    }
    return false; // Exclude if EPC already sent
  });

  // Format the date and time for each new entry
  newRfidData.forEach((data) => {
    const dateObj = new Date(data.timestamp);
    data.date = dateObj.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    data.time = dateObj.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  });

  console.log("epc::::", newRfidData.epc);

  // Render only the new data to the frontend
  res.render("notifData", { rfidData: newRfidData });
});

module.exports = router;
