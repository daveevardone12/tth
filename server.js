const express = require("express");
const app = express();
require("dotenv").config();
const path = require("path");
const passport = require("passport");
const cors = require("cors");
const session = require("express-session");
const flash = require("express-flash");
const compression = require("compression");
const bodyParser = require("body-parser");
const { checkNotAuthenticated, ensureAuthenticated } = require("./middleware/middleware");
const initializePassport = require("./passportConfig");

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
app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false },
}));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
app.use(express.json());
app.use(cors({
  origin: ['http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
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

//------ PASSPORT AUTHENTICATION STRATEGY ------//
const LocalStrategy = require("passport-local").Strategy;

passport.use(
  new LocalStrategy(function (username, password, done) {
    console.log("Attempting login for username:", username);
    tthPool.query(
      "SELECT * FROM users WHERE username = $1",
      [username],
      (err, result) => {
        if (err) {
          console.log("Database error:", err);
          return done(err);
        }
        const user = result.rows[0];
        if (!user) {
          console.log("User not found");
          return done(null, false, { message: "Incorrect username" });
        }

        console.log("Retrieved user:", user);

        if (user.password !== password) {
          console.log("Incorrect password");
          return done(null, false, { message: "Incorrect password" });
        }

        console.log("User authenticated:", user);
        return done(null, user);
      }
    );
  })
);

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  tthPool.query(
    "SELECT * FROM users WHERE id = $1",
    [id],
    (err, result) => {
      if (err) {
        console.log("Error deserializing user:", err);
        return done(err);
      }
      done(null, result.rows[0]);
    }
  );
});

// Middleware to check if user is logged in using Passport
function checkSession(req, res, next) {
  if (!req) {
    return res.redirect("/login");
  }
  next();
}

//------ROUTES------//
app.get("/", (req, res) => {
  res.render("login");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/signup", (req, res) => {
  res.render("signup1");
});

// Route for handling login with Passport authentication
app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/dashboard", // Redirect to dashboard on successful login
    failureRedirect: "/login", // Redirect back to login if authentication fails
    failureFlash: true, // Enable flash messages for failed login
  }),
  (req, res) => {
    // Log session info after successful login
    console.log("Login successful, session data:", req.session);
    res.redirect("/dashboard");
  }
);

// Route to handle the dashboard with session data
app.get("/dashboard", checkSession, (req, res) => {
  console.log("Session data on dashboard:", req.session); // Log session data
  if (req.session.user) {
    return res.render("dashboard", { user: req.session.user });
  } else {
    return res.redirect("/login");
  }
});

// New route for Add Item page
app.get("/add-item", checkSession, (req, res) => {
  res.render("add-item");
});

app.get("/ics", checkSession, (req, res) => {
  res.render("ics");
});

app.get("/ptr", checkSession, (req, res) => {
  res.render("ptr");
});

app.get("/Inventory", checkSession, (req, res) => {
  res.render("Inventory");
});

// Logout route to clear session
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send("Failed to log out");
    }
    res.redirect("/login");
  });
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
