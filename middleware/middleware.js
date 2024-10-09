// function setUserData(req, res, next) {
//   if (req.isAuthenticated()) {
//       res.locals.user_id = req.user.user_id;
//       res.locals.firstname = req.user.firstname;
//       res.locals.lastname = req.user.lastname;
//   } else {
//       res.locals.user_id = null;
//       res.locals.firstname = null;
//       res.locals.lastname = null;
//   }
//   next();
// }

// function ensureAuthenticated(req, res, next) {
//   if (req.isAuthenticated()) {
//       if (req.user.user_id) {
//           return next();
//       } else {
//           res.redirect("/");
//       }
//   } else {
//       res.redirect("/");
//   }
// }



// module.exports = {
//   setUserData,
//   ensureAuthenticated,
// };