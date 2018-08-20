// all the middleware goes there
var middlewareObj = {};

middlewareObj.isLoggedIn = function(req, res, next) {
    if(req.isAuthenticated()) {
        return next();
    }
    req.flash("error", "Please login first!");
    req.session.returnTo = req.path;
    res.redirect("/login");
}

module.exports = middlewareObj;
