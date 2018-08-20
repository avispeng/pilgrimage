var express = require("express");
var router = express.Router();
var User = require("../models/user");
var passport = require("passport");
var middlewareObj = require("../middleware");

// landing page
router.get("/", function(req, res) {
    res.render("landing");
});

router.get("/register", function(req, res) {
    res.render("register");
});

router.post("/register", function(req, res) {
    User.register(new User({username: req.body.username}), req.body.password, function(err, user) {
        if(err) {
            req.flash("error", err.message);
            return res.redirect("/register");
        }
        passport.authenticate("local")(req, res, function() {
            req.flash("success", "Successfully registered.");
            res.redirect(req.session.returnTo || 'back');
            delete req.session.returnTo;
        });
    });
});

router.get("/login", function(req, res) {
    res.render("login");
});

router.post("/login", passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash : true
}), function(req, res) {
    res.redirect(req.session.returnTo || 'back');
    delete req.session.returnTo;
});

router.get("/logout", function(req, res) {
    req.logout();
    req.flash("success", "Successfully log out.");
    res.redirect("/");
})

module.exports = router;
