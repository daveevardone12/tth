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
const bodyParser = require('body-parser');
const { checkNotAuthenticated, ensureAuthenticated } = require("./middleware/middleware");

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

app.get('/dashboard', ensureAuthenticated, (req, res) => {
  const currentDateTime = new Date(); // Get the current date and time
  res.render('dashboard', { currentDateTime }); // Pass the date and time to the template
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});


// Start server with error handling for port in use
app.listen(process.env.PORT, () => {
  console.log(`Server is up and running on port ${process.env.PORT}`);
});