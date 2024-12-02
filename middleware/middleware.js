function setUserData(req, res, next) {
  if (req.isAuthenticated()) {
    res.locals.user_id = req.user.user_id;
    res.locals.first_name = req.user.first_name;
    res.locals.last_name = req.user.last_name;
    res.locals.email = req.user.email;
    res.locals.phone = req.user.phone;
    res.locals.role = req.user.role;
  } else {
    res.locals.user_id = null;
    res.locals.first_name = null;
    res.locals.last_name = null;
    res.locals.email = null;
    res.locals.phone = null;
    res.locals.role = null;
  }
  next();
}

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    if (req.user.user_id) {
      return next();
    } else {
      res.redirect("/login");
    }
  } else {
    res.redirect("/login");
  }
}
function checkNotAuthenticated(req, res, next) {
  console.log("isAuthenticated: ", req.isAuthenticated());
  if (req.isAuthenticated()) {
    const user = req.user;
    console.log("user: ", user);
    switch (user.role) {
      case "admin":
        return res.redirect("/dashboard");
      case "user":
        return res.redirect("/dashboard");
      default:
        return res.redirect("/login");
    }
  }
  next();
}

function checkUserType(userRole) {
  return function (req, res, next) {
    console.log("checkUserType - Is Authenticated:", req.isAuthenticated());
    console.log("User Role:", req.user?.role, "Expected Role:", userRole);
    if (req.isAuthenticated() && req.user.role === userRole && req.user.user_id) {
      return next();
    }
    return res.redirect("/login");
  };
}

module.exports = {
  setUserData,
  ensureAuthenticated,
  checkNotAuthenticated,
  checkUserType,
};