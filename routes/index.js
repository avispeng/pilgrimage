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
    if(!req.session.returnTo && !req.session.backURL) {
        req.session.backURL = req.header('Referer');
    }
    res.render("register", {title: "Register - Pilgrimage"});
});

router.post("/register", function(req, res) {
    User.register(new User({username: req.body.username}), req.body.password, function(err, user) {
        if(err) {
            req.flash("error", err.message);
            return res.redirect("/register");
        }
        passport.authenticate("local")(req, res, function() {
            req.flash("success", "Successfully registered.");
            res.redirect(req.session.returnTo || req.session.backURL || 'back');
            delete req.session.returnTo;
            delete req.session.backURL;
        });
    });
});

router.get("/login", function(req, res) {
    req.session.backURL = req.header('Referer');
    res.render("login", {title: "Login - Pilgrimage"});
});

router.post("/login", passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash : true
}), function(req, res) {
    res.redirect(req.session.returnTo || req.session.backURL || 'back');
    delete req.session.returnTo;
    delete req.session.backURL;
});

router.get("/logout", function(req, res) {
    req.logout();
    req.flash("success", "Successfully log out.");
    res.redirect("/");
})

module.exports = router;
