var express = require("express");
var router = express.Router({mergeParams: true});
var fs = require('fs');
var multer = require('multer');
var City = require("../models/city"),
    Show = require("../models/show"),
    Match = require("../models/match");
var middlewareObj = require("../middleware");

var storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});
var upload = multer({ storage: storage});

var cloudinary = require('cloudinary');
cloudinary.config({
  cloud_name: 'doetad8xo',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

router.get("/cities/:cityId/shows/:showId", function(req, res) {
    Match.find({cityId: req.params.cityId, showId: req.params.showId}, function(err, matches) {
        if(err) {
            req.flash("error", err.message);
            res.redirect("back");
        } else if(matches && matches.length > 0) {
            res.render("matches/list", {title: matches[0].showName + " - " + matches[0].cityName,
            matches: matches, showId: req.params.showId, cityId: req.params.cityId});
        } else {
            res.render("matches/list", {title: "Nothing Found.", matches: null, showId: req.params.showId, cityId: req.params.cityId});
        }
    });
});

router.post("/cities/:cityId/shows/:showId", middlewareObj.isLoggedIn, upload.array("images", 2), function(req, res) {
    req.body.match.showId = req.params.showId;
    req.body.match.cityId = req.params.cityId;
    City.findOne({_id: req.params.cityId, shows: req.params.showId}, function(err, city) {
        if(err) {
            req.flash("error", err.message);
            console.log(err.message);
            res.redirect("back");
        } else if(!city) {
            req.flash("error", "Can't find the city, show or match.");
            res.redirect("/cities");
        } else {
            if(!req.files || req.files.length == 0 || !req.files[0] && !req.files[1]) {
                req.body.match.cityPhoto = "/default-thumbnail.jpg";
                req.body.match.showScreenshot = "/default-thumbnail.jpg";
                Match.create(req.body.match, function(err, match) {
                    if(err) {
                        req.flash("error", err.message);
                        console.log(err.message);
                        res.redirect("/cities/" + req.params.cityId + "/shows/" + req.params.showId);
                    }
                    res.redirect("/cities/" + match.cityId + "/shows/" + match.showId);
                    console.log("no photo no screenshot. match created");
                });
            } else {
                var screenshot = req.files[0];
                var photo = req.files[1];
                if(screenshot && !screenshot.originalname.match(/\.(jpg|jpeg|png|gif)$/) ||
            photo && !photo.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
                    req.flash("error", "Invalid file format. Please upload valid images");
                    res.redirect("/cities/" + req.params.cityId + "/shows/" + req.params.showId + "/new");
                    console.log("Invalid file format. Please upload valid images");
                } else {
                    if(screenshot) {
                        cloudinary.uploader.upload(screenshot.path, function(result) {
                            req.body.match.showScreenshot = result.secure_url;
                            if(photo) {
                                cloudinary.uploader.upload(photo.path, function(result) {
                                    req.body.match.cityPhoto = result.secure_url;
                                    Match.create(req.body.match, function(err, match) {
                                        if(err) {
                                            console.log(err.message);
                                            req.flash("error", err.message);
                                            res.redirect("/cities/" + req.params.cityId + "/shows/" + req.params.showId);
                                        } else {
                                            res.redirect("/cities/" + match.cityId + "/shows/" + match.showId);
                                            console.log("photo and screenshot. match created");
                                        }
                                    });
                                });
                            } else {
                                req.body.match.cityPhoto = "/default-thumbnail.jpg";
                                Match.create(req.body.match, function(err, match) {
                                    if(err) {
                                        console.log(err.message);
                                        req.flash("error", err.message);
                                        res.redirect("/cities/" + req.params.cityId + "/shows/" + req.params.showId);
                                    } else {
                                        res.redirect("/cities/" + match.cityId + "/shows/" + match.showId);
                                        console.log("no photo. match created");
                                    }
                                });
                            }
                        });
                    } else {
                        // only photo
                        req.body.match.showScreenshot = "/default-thumbnail.jpg";
                        cloudinary.uploader.upload(photo.path, function(result) {
                            req.body.match.cityPhoto = result.secure_url;
                            Match.create(req.body.match, function(err, match) {
                                if(err) {
                                    console.log(err.message);
                                    req.flash("error", err.message);
                                    res.redirect("/cities/" + req.params.cityId + "/shows/" + req.params.showId);
                                } else {
                                    res.redirect("/cities/" + match.cityId + "/shows/" + match.showId);
                                    console.log("no screenshot. match created");
                                }
                            });
                        });
                    }
                }
            }
        }
    });
});

router.get("/cities/:cityId/shows/:showId/new", middlewareObj.isLoggedIn, function(req, res) {
    City.findOne({_id: req.params.cityId, shows: req.params.showId}, function(err, city) {
        if(err) {
            req.flash("error", err.message);
            return res.redirect("back");
        } else if(!city) {
            req.flash("error", "Can't find the city, show or match.");
            return res.redirect("/cities");
        }
        Show.findById(req.params.showId, function(err, show) {
            if(err) {
                req.flash("error", err.message);
                return res.redirect("back");
            } else if(!show) {
                req.flash("error", "Can't find the show.");
                return res.redirect("/cities/" + req.params.cityId);
            }
            return res.render("matches/new", {title: "New", city: city, show: show});
        });
    });
    // City.findById(req.params.cityId, function(err, city) {
    //     if(err) {
    //         req.flash("error", err.message);
    //         res.redirect("back");
    //     } else if(!city) {
    //         req.flash("error", "Can't find the city.");
    //         res.redirect("/cities");
    //     }
    //     Show.findById(req.params.showId, function(err, show) {
    //         if(err) {
    //             req.flash("error", err.message);
    //             res.redirect("back");
    //         } else if(!show) {
    //             req.flash("error", "Can't find the show.");
    //             res.redirect("/cities/" + req.params.cityId);
    //         }
    //         res.render("matches/new", {title: "New", city: city, show: show});
    //     });
    // });

});

router.get("/matches/:id/cityPhoto", function(req, res) {
    Match.findById(req.params.id, function(err, found) {
        if(err) {
            req.flash("error", err.message);
            return res.redirect("back");
        } else if(!found) {
            req.flash("error", "Can't find the Image.");
            return res.redirect("back");
        }
        res.render("matches/image", {title: "City Photo", imageURL: found.cityPhoto});
    });
});

router.get("/matches/:id/showScreenshot", function(req, res) {
    Match.findById(req.params.id, function(err, found) {
        if(err) {
            req.flash("error", err.message);
            return res.redirect("back");
        } else if(!found) {
            req.flash("error", "Can't find the Image.");
            return res.redirect("back");
        }
        res.render("matches/image", {title: "Show Screenshot", imageURL: found.showScreenshot});
    });
});

module.exports = router;
