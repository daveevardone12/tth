const express = require("express");
const app = express();
const ejs = require("ejs");
const path = require("path");
const cors = require("cors");
const passport = require("passport");
require("dotenv").config();
const session = require("express-session");
const flash = require("express-flash");

//-------DATABASES IMPORTING-------//
const tthPool = require("./models/tthDB");

//-------ROUTES--------//
const signupRoutes = require("./routes/signup");
const loginRoutes = require("./routes/login");
const dashboardRoutes = require("./routes/dashboard");
const userRoutes = require("./routes/user"); // Import user routes

//-------CONNECTING TO DATABASE-------//
tthPool
  .connect()
  .then(() => console.log("Connected to TTH database"))
  .catch((err) => console.error("Error connecting to TTH database:", err));

//-------INITIALIZING VIEW ENGINE AND PATH------//
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use("/node_modules", express.static(path.join(__dirname, "node_modules")));
app.use(cors());

app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(flash());

// Middleware to check if user is logged in
function checkSession(req, res, next) {
  if (!req.session.userId) {
    return res.redirect("/login");
  }
  next();
}

app.use((req, res, next) => {
  res.header("Cache-Control", "private, no-cache, no-store, must-revalidate");
  res.header("Expires", "-1");
  res.header("Pragma", "no-cache");
  next();
});

//------INITIALIZE ROUTES------//
app.use("/", signupRoutes);
app.use("/", loginRoutes);
app.use("/", userRoutes); // Use user routes for profile management

// Existing routes
app.get("/", (req, res) => {
  res.render("login");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/signup", (req, res) => {
  res.render("signup1");
});

app.get("/dashboard", checkSession, async (req, res) => {
  res.render("dashboard");
});

// New route for Add Item page
app.get("/add-item", checkSession, (req, res) => {
  res.render("add-item");
});

app.get("/par", checkSession, (req, res) => {
  res.render("par");
});

app.get("/ics", checkSession, (req, res) => {
  res.render("ics");
});

app.get("/user", checkSession, (req, res) => {
  res.render("user");
});

// Start server with error handling for port in use
const PORT = process.env.PORT || 3000;
app.listen(PORT, (err) => {
  if (err) {
    console.error(`Failed to start server on port ${PORT}:`, err);
  } else {
    console.log(`Server is up and running on port ${PORT}`);
  }
}).on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use. Try using a different port.`);
  } else {
    console.error("Server error:", err);
  }
});
