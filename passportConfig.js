const LocalStrategy = require("passport-local").Strategy;
const passport = require("passport");
const tthPool = require("./models/tthDB");
const bcrypt = require("bcrypt");

const authenticateuser = (email, password, done) => {
  const userEmail = email.trim();

  tthPool.query("SELECT * FROM users WHERE email = $1", [userEmail],
    async (err, results) => {
      if (err) {
        console.error("Database error: ", err);
        return done(err);
      }
      if (results.rows.length > 0) {
        const user = results.rows[0];
        try {
          const isMatch = await bcrypt.compare(password, user.password);
          if (isMatch) {
            return done(null, user);
          } else {
            return done(null, false, { message: "password is incorrect" });
          }
        } catch (compareErr) {
          return done(compareErr);
        }
      } else {
        return done(null, false, { message: "email not registered" });
      }
    }
  )
};

function initialize(passport) {
  passport.use(
    new LocalStrategy({
      usernameField: 'email',
      passwordField: 'password',
    }, authenticateuser)
  );
};

passport.serializeUser((user, done) => {
  if (!user || typeof user !== 'object' || !user.user_id) {
    return done(new Error("User not found or ID is missing"));
  }
  done(null, user.user_id);
});

passport.deserializeUser((id, done) => {
  tthPool.query("SELECT * FROM users WHERE user_id = $1", [id], (err, results) => {
    if (err) {
      return done(err);
    }
    if (results.rows.length === 0) {
      return done(new Error("User not found"));
    }
    const user = results.rows[0];
    done(null, user);
  });
});

module.exports = initialize;