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
const { SerialPort } = require("serialport");
const WebSocket = require("ws");
const http = require("http");
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const bodyParser = require("body-parser");

let rfidData = []; // Store scanned data
const SCAN_INTERVAL = 10 * 60 * 1000; // 10 minutes in milliseconds
let lastProcessedTime = Date.now(); // Track last processed time

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

serialPort.on("data", (data) => {
  const currentTime = Date.now();

  // Only process data if 10 minutes have passed
  // if (currentTime - lastProcessedTime >= SCAN_INTERVAL) {
  const parsed = parseRFIDHexData(data.toString("hex"));
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
  // } else {
  //   console.log("Ignoring scan; waiting for the next interval.");
  // }
});

serialPort.on("error", (err) => {
  console.error(`Serial port error: ${err.message}`);
});

wss.on("connection", (ws) => {
  console.log("WebSocket client connected");
  ws.send("Connected to WebSocket server");
});

function parseRFIDHexData(data) {
  try {
    const hexString = data.toString("hex"); // Convert buffer to hex string
    console.log(`Hex data: ${hexString}`);

    if (hexString.startsWith("ccffff")) {
      const pc = hexString.slice(14, 18); // Example: Protocol Control
      const epc = hexString.slice(18, 42); // Example: EPC (24 hex characters)
      const rssi = parseInt(hexString.slice(42, 46), 16); // Example: RSSI in hexadecimal
      return {
        pc: pc.toUpperCase(),
        epc: epc.toUpperCase(),
        rssi: `${rssi}dBm`,
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

// Functions to control the buzzer
function enableBuzzer() {
  // Add the logic to enable the buzzer
  console.log("Buzzer enabled.");
  // Example: Send a command or signal to the buzzer
  serialPort.write("BUZZER_ON\n");
}

function disableBuzzer() {
  // Add the logic to disable the buzzer
  console.log("Buzzer disabled.");
  // Example: Send a command or signal to the buzzer
  serialPort.write("BUZZER_OFF\n");
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
const notifRoutes = require("./routes/notif");
const prsRoutes = require("./Routes/prs");
const mrerRoutes = require("./Routes/mrer");
const wmrfRoutes = require("./routes/wmrf");

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

app.get("/rfid-data", (req, res) => {
  res.render("rfid-data", { rfidData }); // Pass the data to the EJS page
});

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
