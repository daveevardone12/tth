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
const axios = require("axios");
const nodemailer = require("nodemailer");
const WebSocket = require("ws");
const http = require("http");
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const moment = require("moment");
const twilio = require("twilio");
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client1 = twilio(accountSid, authToken);

// Initialize Twilio Client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

let rfidData = new Set(); // Using Set for O(1) lookups
let counter = 0;
async function findAvailablePort() {
  try {
    const ports = await SerialPort.list(); // ✅ Correct method

    if (ports.length === 0) {
      console.warn("⚠️ No serial ports found.");
      return null;
    }

    // Find the first available port
    const validPort = ports.find(
      (port) => port.path.includes("COM") || port.path.includes("/dev/ttyUSB")
    );

    return validPort ? validPort.path : null;
  } catch (error) {
    console.error("❌ Error detecting serial ports:", error);
    return null;
  }
}

(async () => {
  let SERIAL_PORT;
  try {
    SERIAL_PORT = await findAvailablePort();
  } catch (error) {
    console.error("⚠️ Error detecting serial port:", error.message);
  }

  const BAUD_RATE = process.env.BAUD_RATE
    ? parseInt(process.env.BAUD_RATE)
    : 9600;

  if (!SERIAL_PORT) {
    console.warn(
      "⚠️ No available serial port detected. Running in offline mode."
    );
  } else {
    console.log(`✅ Connecting to: ${SERIAL_PORT} at ${BAUD_RATE} baud`);

    const serialPort = new SerialPort({
      path: SERIAL_PORT,
      baudRate: BAUD_RATE,
      dataBits: 8,
      parity: "none",
      stopBits: 1,
      flowControl: false,
      autoOpen: false,
    });

    serialPort.open((err) => {
      if (err) {
        console.error(
          `❌ Serial Port Error: Could not open ${SERIAL_PORT}:`,
          err.message
        );
      } else {
        console.log("✅ Serial Port Opened:", SERIAL_PORT);
      }
    });

    serialPort.on("data", async (data) => {
      const currentTime = Date.now();
      const parsed = parseRFIDHexData(data.toString("hex"), currentTime);

      if (parsed) {
        console.log("Parsed Data:", parsed);

        // Broadcast to WebSocket clients
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(parsed));
          }
        });
      } else {
        console.log("Could not parse data.");
      }
    });
  }

  // Independent Counter Logic (Runs Regardless of Serial Connection)
  let counter = 0;
  setInterval(() => {
    counter++;
    console.log(`Counter: ${counter}`);
  }, 1000);

  // ✅ Ensure processRFIDData function is defined before calling it
  async function processRFIDData() {
    console.log("Processing RFID Data...");
    // Add your processing logic here
  }

  // Process RFID Data Every 10 Seconds (Runs Regardless of Serial Connection)
  setInterval(() => {
    console.log("10 seconds elapsed. Proceeding to process RFID data...");
    processRFIDData();
  }, 10000);
})();

wss.on("connection", (ws) => {
  console.log("WebSocket client connected");
  ws.send("Connected to WebSocket server");
});

// Function to Parse RFID Hex Data
function parseRFIDHexData(data, currentTime) {
  try {
    const hexString = data.toString("hex"); // Convert buffer to hex string

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

function formatTimestamp(isoString) {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "full", // e.g., January 25, 2025
    timeStyle: "short", // e.g., 2:06 PM
  }).format(date);
}

const {
  checkNotAuthenticated,
  ensureAuthenticated,
} = require("./middleware/middleware");

//-------DATABASES IMPORTING-------//
const tthPool = require("./models/tthDB");

//-------ROUTES--------//
const signupRoutes = require("./routes/signup");
const loginRoutes = require("./Routes/login");
const dashboardRoutes = require("./routes/dashboard");
const userRoutes = require("./Routes/user");
const parRoutes = require("./Routes/par");
const ptrRoutes = require("./routes/ptr");
const icsRoutes = require("./routes/ics");
const inventoryRoutes = require("./Routes/inventory");
const addItemRoutes = require("./routes/add-item");
const notifRoutes = require("./Routes/notif");
const prsRoutes = require("./Routes/prs");
const mrerRoutes = require("./Routes/mrer");
const wmrfRoutes = require("./Routes/wmrf");
const rfidRoutes = require("./Routes/rfid");
const { timeStamp } = require("console");
const registerCallerID = require("./Routes/registerCallerID");

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

// app.get("/register-phone", (req, res) => {
//   res.render("registerCallerID"); // Render register.ejs
// });

// app.post("/register-caller-id", async (req, res) => {
//   const { phoneNumber, friendlyName } = req.body;
//   const accountSid = process.env.TWILIO_ACCOUNT_SID;
//   const authToken = process.env.TWILIO_AUTH_TOKEN;

//   try {
//     const response = await axios.post(
//       `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/OutgoingCallerIds.json`,
//       new URLSearchParams({
//         PhoneNumber: phoneNumber, // Number to register
//         FriendlyName: friendlyName || "My Caller ID", // Optional name
//       }).toString(),
//       {
//         auth: {
//           username: accountSid,
//           password: authToken,
//         },
//         headers: {
//           "Content-Type": "application/x-www-form-urlencoded", // Proper content type
//         },
//       }
//     );

//     // Log and send a success response
//     console.log("Response from Twilio:", response.data);
//     res.send(
//       `<h2>Caller ID registered successfully!</h2>
//        <p>Verification code sent to: ${phoneNumber}</p>
//        <a href="/register-caller-id">Go Back</a>`
//     );
//   } catch (error) {
//     // Log detailed error
//     console.error(
//       "Error Response from Twilio:",
//       error.response?.data || error.message
//     );
//     res.status(400).send(
//       `<h2>Error:</h2>
//        <p>${error.response?.data?.message || error.message}</p>
//        <a href="/register-caller-id">Go Back</a>`
//     );
//   }
// });

// app.post("/verify-caller-id", async (req, res) => {
//   const { sid, verificationCode } = req.body; // SID of the Caller ID and verification code

//   try {
//     const response = await client1.outgoingCallerIds(sid).update({
//       VerificationCode: verificationCode,
//     });

//     console.log("Verification successful:", response);

//     res.send(
//       `<h2>Caller ID verified successfully!</h2><a href="/">Go Back</a>`
//     );
//   } catch (error) {
//     console.error("Error verifying Caller ID:", error.message);
//     res
//       .status(400)
//       .send(`<h2>Error:</h2><p>${error.message}</p><a href="/">Try Again</a>`);
//   }
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
app.use("/registerCallerID", registerCallerID);

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

app.get("/machinery", (req, res) => {
  res.render("machinery"); // Ensure 'machinery.ejs' is in your 'views' folder
});

app.get("/books", (req, res) => {
  res.render("books"); // Ensure 'machinery.ejs' is in your 'views' folder
});
app.get("/Agricultural", (req, res) => {
  res.render("Agricultural"); // Ensure 'machinery.ejs' is in your 'views' folder
});
app.get("/Communication", (req, res) => {
  res.render("Communication"); // Ensure 'machinery.ejs' is in your 'views' folder
});
app.get("/disaster", (req, res) => {
  res.render("disaster"); // Ensure 'machinery.ejs' is in your 'views' folder
});
app.get("/furniture", (req, res) => {
  res.render("furniture"); // Ensure 'machinery.ejs' is in your 'views' folder
});
app.get("/Information", (req, res) => {
  res.render("Information"); // Ensure 'machinery.ejs' is in your 'views' folder
});
app.get("/marine", (req, res) => {
  res.render("marine"); // Ensure 'machinery.ejs' is in your 'views' folder
});
app.get("/medical", (req, res) => {
  res.render("medical"); // Ensure 'machinery.ejs' is in your 'views' folder
});
app.get("/military", (req, res) => {
  res.render("military"); // Ensure 'machinery.ejs' is in your 'views' folder
});
app.get("/motor", (req, res) => {
  res.render("motor"); // Ensure 'machinery.ejs' is in your 'views' folder
});
app.get("/office", (req, res) => {
  res.render("office"); // Ensure 'machinery.ejs' is in your 'views' folder
});
app.get("/OtherMachinery", (req, res) => {
  res.render("OtherMachinery"); // Ensure 'machinery.ejs' is in your 'views' folder
});
app.get("/printing", (req, res) => {
  res.render("printing"); // Ensure 'machinery.ejs' is in your 'views' folder
});
app.get("/software", (req, res) => {
  res.render("software"); // Ensure 'machinery.ejs' is in your 'views' folder
});
app.get("/sports", (req, res) => {
  res.render("sports"); // Ensure 'machinery.ejs' is in your 'views' folder
});

app.get("/Inventory", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM inventory"); // Ensure table name is correct
    res.json(result.rows);
  } catch (err) {
    console.error("Database Query Error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
