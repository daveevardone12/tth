const express = require("express");
const app = express();
const ejs = require("ejs");
const path = require("path");
const passport = require("passport");

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use("/static", express.static("static"));
app.use("/public", express.static("public"));

app.get("/", async (req, res) => {
  res.render("login");
});

app.get("/signup", async (req, res) => {
  res.render("signup1");
});

app.get("/dashboard", async (req, res) => {
  res.render("dashboard");
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server started at ${PORT}`);
});