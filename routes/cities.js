var express = require("express");
var router = express.Router({mergeParams: true});
var fs = require('fs');
var multer = require('multer');
var City = require("../models/city"),
    Show = require("../models/show");
var middlewareObj = require("../middleware");
var upload = multer({ dest: 'tmp/' });

// grid of all cities
router.get("/", function(req, res) {
    City.find({}).populate("shows").exec(function(err, cities) {
        if(err) {
            req.flash("error", err.message);
            res.redirect("/");
        } else {
            res.render("cities/index", {headline: "Popular Cities", cities: cities});
        }
    });
});

// add a new city
router.post("/", middlewareObj.isLoggedIn, upload.single('image'), function(req, res) {
    if(!req.file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
        // console.log("wrong file type");
        req.flash("error", "Invalid file format. Please upload a valid image.");
        return res.redirect("/new");
    }
    var tmpPath = req.file.path;
    var targetPath = "public/city-images/" + Date.now() + '-' + req.file.originalname;
    fs.rename(tmpPath, targetPath, function(err) {
        if(err) {
            req.flash("error", err.message);
            return res.redirect("/new");
        }
        City.create({
            name: req.body.name,
            country: req.body.country,
            imageURL: [targetPath.slice(6)],
            intro: req.body.intro,
            // shows: shows
        }, function(err, city) {
            if(err) {
                req.flash("error", err.message);
                return res.redirect("/new");
            }
            console.log("city added");
            // helper function
            function asyncLoopAddShows(i, cb) {
                if(i < req.body.show.length) {
                    Show.findOne({'douban': req.body.douban[i]}).exec(function(err, show) {
                        if(!show) {
                            console.log("create the new show");
                            Show.create({
                                name: req.body.show[i],
                                douban: req.body.douban[i]
                            }, function(err, show) {
                                if(!err) {
                                    city.shows.push(show["_id"]);
                                    city.save(function(err, updated) {
                                        if(err) {
                                            console.log("update shows to city error");
                                            return res.render("error", {msg: "update shows to city error"});
                                        } else {
                                            console.log("show added");
                                            asyncLoopAddShows(i+1, cb);
                                        }
                                    });
                                }
                            });
                        } else {
                            city.shows.push(show["_id"]);
                            city.save(function(err, updated) {
                                if(err) {
                                    req.flash("error", err.message);
                                    return res.redirect("/");
                                } else {
                                    console.log("show added");
                                    asyncLoopAddShows(i+1, cb);
                                }
                            });
                        }
                    });
                } else {
                    cb();
                }
            }

            asyncLoopAddShows(0, function() {
                req.flash("success", "City added.");
                res.redirect("/cities/" + city._id);
            });
        });
    });
});

// new city form
router.get("/new", middlewareObj.isLoggedIn, function(req, res) {
    res.render("cities/new");
});

// searching results
router.get("/results", function(req, res) {
    var query = req.query.city;
    // get the result list from db
    // redirect to cities with result
    City.find({name: query}, function(err, cities) {
        if(err) {
            req.flash("error", err.message);
            res.redirect("/");
        } else {
            res.render("cities/results", {headline: "Searching Results", cities: cities});
        }
    });
});

// detail page of one city (shows that've been shot there)
router.get("/:id", function(req, res) {
    // var id = req.params.id;
    City.findById(req.params.id, function(err, found) {
        if(err) {
            req.flash("error", err.message);
            res.redirect("back");
        } else {
            res.render("cities/detail", {city: found});
        }
    });
});

// add-new-show form for this city
router.get("/:id/shows/new", function(req, res) {
    // add show to this city

});

// Edit
router.get("/:id/edit", middlewareObj.isLoggedIn, function(req, res) {
    City.findById(req.params.id).populate("shows").exec(function(err, found) {
        if(err) {
            req.flash("error", err.message);
            res.redirect("/cities");
        } else {
            res.render("cities/edit", {city: found});
        }
    });
});

// update
router.put("/:id", middlewareObj.isLoggedIn, function(req, res) {
    // can wrap things up in one object in ejs file
    // but we have more complicated situation
    // better handle the array and build a new object
    // var city = ...
    City.findByIdAndUpdate(req.params.id, city, function(err, updated) {
        if(err) {
            req.flash("error", err.message);
            res.redirect("/cities");
        } else {
            res.redirect("/cities" + req.params.id);
        }
    });
});

module.exports = router;