var express = require("express");
var router = express.Router({mergeParams: true});
var fs = require('fs');
var multer = require('multer');
var City = require("../models/city"),
    Show = require("../models/show");

var upload = multer({ dest: 'tmp/' });

// grid of all cities
router.get("/", function(req, res) {
    City.find({}).populate("shows").exec(function(err, cities) {
        if(err) {
            res.render("error", {msg: "don't find any"});
        } else {
            res.render("cities/index", {headline: "Popular Cities", cities: cities});
        }
    });
});

// add a new city
router.post("/", upload.single('image'), function(req, res) {
    if(!req.file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
        // console.log("wrong file type");
        return res.render("error", {msg: "wrong file type"});
    }
    var tmpPath = req.file.path;
    var targetPath = "public/city-images/" + Date.now() + '-' + req.file.originalname;
    fs.rename(tmpPath, targetPath, function(err) {
        if(err) {
            console.log("filename error");
            return res.render("error", {msg: "filename error"});
        }
        City.create({
            name: req.body.name,
            country: req.body.country,
            imageURL: [targetPath.slice(6)],
            intro: req.body.intro,
            // shows: shows
        }, function(err, city) {
            if(err) {
                console.log("adding city error");
                return res.render("error", {msg: "adding city error"});
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
                    cb();
                }
            }

            asyncLoopAddShows(0, function() {
                console.log("adding shows done...");
                res.render("success", {msg: "city added"});
            });

        });
    });

});

// new city form
router.get("/new", function(req, res) {
    res.render("cities/new");
});

// searching results
router.get("/results", function(req, res) {
    var query = req.query.city;
    // get the result list from db
    // redirect to cities with result
    City.find({name: query}, function(err, cities) {
        if(err) {
            res.render("error", {msg: "unknown error"});
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
            res.render("error", {msg : "there is no such city"});
        } else {
            res.render("cities/detail", {city: found});
        }
    });
});

// add-new-show form for this city
router.get("/:id/shows/new", function(req, res) {
    // add show to this city

});

module.exports = router;
