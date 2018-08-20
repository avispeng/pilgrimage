var express = require("express");
var router = express.Router({mergeParams: true});
var fs = require('fs');
var multer = require('multer');
var City = require("../models/city"),
    Show = require("../models/show");
var middlewareObj = require("../middleware");
var upload = multer({ dest: 'tmp/' });

// grid of all cities
router.get("/cities", function(req, res) {
    City.find({}, function(err, cities) {
        if(err) {
            req.flash("error", err.message);
            res.redirect("/cities");
        } else {
            res.render("cities/index", {headline: "Popular Cities", cities: cities, title: "Cities - Pilgrimage"});
        }
    });
});

// new city form
router.get("/cities/new", middlewareObj.isLoggedIn, function(req, res) {
    res.render("cities/new", {title: "New City - Pilgrimage"});
});

// add a new city
router.post("/cities", middlewareObj.isLoggedIn, upload.single('image'), function(req, res) {
    if(!req.file) {
        var targetPath = "public/default-thumbnail.jpg";
    } else {
        if(!req.file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
            // console.log("wrong file type");
            req.flash("error", "Invalid file format. Please upload a valid image.");
            return res.redirect("/cities/new");
        }
        var tmpPath = req.file.path;
        var targetPath = "public/city-images/" + Date.now() + '-' + req.file.originalname;
        fs.rename(tmpPath, targetPath, function(err) {
            if(err) {
                req.flash("error", err.message);
                // return res.redirect("/cities/new");
            }
            // fs.unlink(tmpPath, function(err) {
            //     if(err) {
            //         req.flash("error", err.message);
            //         // return res.redirect("/cities/new");
            //     }
            // });
        });
    }
    City.create({
        name: req.body.name,
        country: req.body.country,
        imageURL: targetPath.slice(6),
        intro: req.body.intro,
        // shows: shows
    }, function(err, city) {
        if(err) {
            req.flash("error", err.message);
            return res.redirect("/cities/new");
        }
        console.log("city added");

        var shows = [];
        asyncLoopAddShows(0, req, shows, function() {
            city.shows = shows;
            city.save(function(err, updated) {
                if(err) {
                    req.flash("error", err.message);
                    return res.redirect("/cities");
                } else {
                    console.log("shows added");
                    req.flash("success", "City added.");
                    res.redirect("/cities/" + city._id);
                }
            });
        });
    });
});

// searching results
router.get("/cities/results", function(req, res) {
    var query = req.query.city;
    if(query && query.length > 0) {
        const regex = new RegExp(escapeRegex(query), 'gi');
        City.find({name: regex}).populate("shows").exec(function(err, cities) {
            if(err) {
                req.flash("error", err.message);
                res.redirect("/cities");
            } else {
                res.render("cities/results", {headline: "Searching Results", cities: cities, title: "Cities - Pilgrimage"});
            }
        });
    } else {
        City.find({}).populate("shows").exec(function(err, cities) {
            if(err) {
                req.flash("error", err.message);
                res.redirect("/cities");
            } else {
                res.render("cities/results", {headline: "Searching Results", cities: cities, title: "Cities - Pilgrimage"});
            }
        });
    }
});

// detail page of one city (shows that've been shot there)
router.get("/cities/:id", function(req, res) {
    // var id = req.params.id;
    City.findById(req.params.id).populate("shows").exec(function(err, found) {
        if(err) {
            req.flash("error", err.message);
            res.redirect("back");
        } else if(!found) {
            console.log("Can't find the city.");
            req.flash("error", "Can't find the city.");
            res.redirect("/cities");
        } else {
            res.render("cities/detail", {city: found, title: found.name + " - Pilgrimage"});
        }
    });
});

// add-new-show form for this city
router.get("/cities/:id/shows/new", function(req, res) {
    // add show to this city

});

// Edit
router.get("/cities/:id/edit", middlewareObj.isLoggedIn, function(req, res) {
    City.findById(req.params.id).populate("shows").exec(function(err, found) {
        if(err) {
            req.flash("error", err.message);
            res.redirect("/cities/" + req.params.id);
        } else if(!found) {
            console.log("Can't find the city.");
            req.flash("error", "Can't find the city.");
            res.redirect("/cities");
        } else {
            res.render("cities/edit", {city: found, title: "Edit - Pilgrimage"});
        }
    });
});

// update
router.put("/cities/:id", middlewareObj.isLoggedIn, upload.single('image'), function(req, res) {
    // can wrap things up in one object in ejs file
    // if we have more complicated situation
    // better handle the array and build a new object
    // var city = ...
    var city = req.body.city;
    if(req.file) {
        if(!req.file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
            req.flash("error", "Invalid file format. Please upload a valid image.");
            return res.redirect("/cities/" + req.params.id + "/edit");
        }
        var tmpPath = req.file.path;
        var targetPath = "public/city-images/" + Date.now() + '-' + req.file.originalname;
        fs.rename(tmpPath, targetPath, function(err) {
            if(err) {
                req.flash("error", err.message);
            }
            // better delete original image if there is one
        });
        city.imageURL = targetPath.slice(6);
    }
    var shows = [];
    asyncLoopAddShows(0, req, shows, function() {
        city.shows = shows;
        City.findByIdAndUpdate(req.params.id, city, {upsert: true, new: true}, function(err, updated) {
            if(err) {
                req.flash("error", err.message);
                res.redirect("/cities/" + req.params.id);
            } else {
                req.flash("success", "City Updated.");
                res.redirect("/cities/" + req.params.id);
            }
        });
    });
});

// helper functions
function asyncLoopAddShows(i, req, shows, cb) {
    if(i < req.body.show.length) {
        if(req.body.douban[i].length == 0 || req.body.show[i].length == 0) {
            asyncLoopAddShows(i+1, req, shows, cb);
        } else {
            Show.findOne({'douban': req.body.douban[i]}).exec(function(err, show) {
                if(!show) {
                    console.log("create the new show");
                    Show.create({
                        name: req.body.show[i],
                        douban: req.body.douban[i]
                    }, function(err, show) {
                        if(!err) {
                            shows.push(show["_id"]);
                            asyncLoopAddShows(i+1, req, shows, cb);
                        }
                    });
                } else {
                    shows.push(show["_id"]);
                    asyncLoopAddShows(i+1, req, shows, cb);
                }
            });
        }
    } else {
        cb();
    }
}

function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

module.exports = router;
