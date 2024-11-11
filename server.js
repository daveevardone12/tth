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

app.use((req, res, next) => {
  res.header("Cache-Control", "private, no-cache, no-store, must-revalidate");
  res.header("Expires", "-1");
  res.header("Pragma", "no-cache");
  next();
});

//------INITIALIZE ROUTES------//
app.use("/", signupRoutes);
app.use("/", loginRoutes);


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

app.get("/dashboard", async (req, res) => {
  res.render("dashboard");
});

// New route for Add Item page
app.get("/add-item", (req, res) => {
  res.render("add-item"); // Render the add-item.ejs view
});
app.get("/par", (req, res) => {
  res.render("par"); // Render the add-item.ejs view
});

app.get("/ics", (req, res) => {
  res.render("ics"); // Render the add-item.ejs view
});

app.get("/ptr", (req, res) => {
  res.render("ptr"); // Render the ptr.ejs view
});

// Start server
app.listen(process.env.PORT, () => {
  console.log(`Server is up and running on port ${process.env.PORT}`);
});
