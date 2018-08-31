var express = require("express");
var router = express.Router({mergeParams: true});
var fs = require('fs');
var multer = require('multer');
var City = require("../models/city"),
    Show = require("../models/show");
var middlewareObj = require("../middleware");

// var upload = multer({ dest: 'tmp/' });

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

// grid of all cities
router.get("/cities", function(req, res) {
    var perPage = 12;
    var pageQuery = parseInt(req.query.page);
    var pageNumber = pageQuery ? pageQuery : 1;

    City.find({}).skip((perPage * pageNumber) - perPage).limit(perPage).exec(function(err, cities) {
        City.countDocuments().exec(function(err, count) {
            if(err) {
                req.flash("error", err.message);
                res.redirect("/cities");
            } else {
                res.render("cities/index", {
                    headline: "All Cities",
                    cities: cities,
                    title: "Cities - Pilgrimage",
                    current: pageNumber,
                    pages: Math.ceil(count / perPage)
                });
            }
        });
    });
});

// new city form
router.get("/cities/new", middlewareObj.isLoggedIn, function(req, res) {
    res.render("cities/new", {title: "New City - Pilgrimage"});
});

// add a new city
router.post("/cities", middlewareObj.isLoggedIn, upload.array('images', 2), function(req, res) {
    console.log(req.files);
    // code below for local storage
    // if(!req.file) {
    //     var targetPath = "public/default-thumbnail.jpg";
    // } else {
    //     if(!req.file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
    //         // console.log("wrong file type");
    //         req.flash("error", "Invalid file format. Please upload a valid image.");
    //         return res.redirect("/cities/new");
    //     }
    //     var tmpPath = req.file.path;
    //     var targetPath = "public/city-images/" + Date.now() + '-' + req.file.originalname;
    //     fs.rename(tmpPath, targetPath, function(err) {
    //         if(err) {
    //             req.flash("error", err.message);
    //             // return res.redirect("/cities/new");
    //         }
    //         // fs.unlink(tmpPath, function(err) {
    //         //     if(err) {
    //         //         req.flash("error", err.message);
    //         //         // return res.redirect("/cities/new");
    //         //     }
    //         // });
    //     });
    // }

    // code below for cloud storage
    if(!req.files || req.files.length == 0) {
        req.body.city.imageURL = "/default-thumbnail.jpg";
        req.body.city.bannerURL = "/default-thumbnail.jpg";
        var shows = [];
        asyncLoopAddShows(0, req, shows, function() {
            req.body.city.shows = shows;
            City.create(req.body.city, function(err, city) {
                if(err) {
                    req.flash("error", err.message);
                    return res.redirect("/cities");
                }
                console.log("shows added");
                req.flash("success", "City added.");
                res.redirect("/cities/" + city._id);
            });
        });
    } else {
        if(!req.files[0].originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
            // console.log("wrong file type");
            req.flash("error", "Invalid file format. Please upload a valid image.");
            // return res.redirect("/cities/new");
            return res.status(200).json({url: null});
        }
        cloudinary.uploader.upload(req.files[0].path, function(result) {
            // picture
            req.body.city.imageURL = result.secure_url;
            cloudinary.uploader.upload(req.files[1].path, function(resultBanner) {
                // banner
                req.body.city.bannerURL = resultBanner.secure_url;

                var shows = [];
                asyncLoopAddShows(0, req, shows, function() {
                    req.body.city.shows = shows;
                    City.create(req.body.city, function(err, city) {
                        if(err) {
                            req.flash("error", err.message);
                            // return res.redirect("/cities");
                            return res.status(200).json({url: "/cities"});
                        }
                        console.log("shows added");
                        req.flash("success", "City added.");
                        // res.redirect("/cities/" + city._id);
                        return res.status(200).json({url: "/cities/" + city._id});
                    });
                });
            });
        });
    }
});

// searching results
router.get("/cities/results", function(req, res) {
    var perPage = 13;
    var pageQuery = parseInt(req.query.page);
    var pageNumber = pageQuery ? pageQuery : 1;

    var query = req.query.city;
    if(query && query.length > 0) {
        const regex = new RegExp(escapeRegex(query), 'gi');
        City.find({name: regex}).skip((perPage * pageNumber) - perPage).limit(perPage).populate("shows").exec(function(err, cities) {
            City.countDocuments({name: regex}).exec(function(err, count) {
                if(err) {
                    req.flash("error", err.message);
                    res.redirect("/cities");
                } else {
                    res.render("cities/results", {
                        headline: "Searching Results",
                        cities: cities,
                        title: "Cities - Pilgrimage",
                        current: pageNumber,
                        pages: Math.ceil(count / perPage),
                        query: query
                    });
                }
            });
        });
    } else {
        City.find({}).skip((perPage * pageNumber) - perPage).limit(perPage).populate("shows").exec(function(err, cities) {
            City.countDocuments().exec(function(err, count) {
                if(err) {
                    req.flash("error", err.message);
                    res.redirect("/cities");
                } else {
                    res.render("cities/results", {
                        headline: "Searching Results",
                        cities: cities,
                        title: "Cities - Pilgrimage",
                        current: pageNumber,
                        pages: Math.ceil(count / perPage),
                        query: query
                    });
                }
            });
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
router.put("/cities/:id", middlewareObj.isLoggedIn, upload.array('images', 2), function(req, res) {
    // var city = req.body.city;
    // code below for local storage
    // if(req.file) {
    //     if(!req.file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
    //         req.flash("error", "Invalid file format. Please upload a valid image.");
    //         return res.redirect("/cities/" + req.params.id + "/edit");
    //     }
    //     var tmpPath = req.file.path;
    //     var targetPath = "public/city-images/" + Date.now() + '-' + req.file.originalname;
    //     fs.rename(tmpPath, targetPath, function(err) {
    //         if(err) {
    //             req.flash("error", err.message);
    //         }
    //         // better delete original image if there is one
    //     });
    //     city.imageURL = targetPath.slice(6);
    // }
    if(req.files && req.files.length > 0) {
        if(!req.files[0].originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
            // console.log("wrong file type");
            req.flash("error", "Invalid file format. Please upload a valid image.");
            return res.status(200).json({url: null});
            // return res.redirect("/cities/" + req.params.id + "/edit");
        }
        cloudinary.uploader.upload(req.files[0].path, function(result) {
            // picture
            req.body.city.imageURL = result.secure_url;
            cloudinary.uploader.upload(req.files[1].path, function(resultBanner) {
                // banner
                req.body.city.bannerURL = resultBanner.secure_url;
                var shows = [];
                asyncLoopAddShows(0, req, shows, function() {
                    if(req.body.addedId) {
                        req.body.city.shows = req.body.addedId.concat(shows);
                    } else {
                        req.body.city.shows = shows;
                    }
                    City.findByIdAndUpdate(req.params.id, req.body.city, {upsert: true, new: true}, function(err, updated) {
                        if(err) {
                            req.flash("error", err.message);
                            // return res.redirect("/cities/" + req.params.id);
                            return res.status(200).json({url: "/cities/" + req.params.id});
                        }
                        req.flash("success", "City Updated.");
                        // res.redirect("/cities/" + req.params.id);
                        return res.status(200).json({url: "/cities/" + req.params.id});
                    });
                });
            });
        });
    } else {
        var shows = [];
        asyncLoopAddShows(0, req, shows, function() {
            if(req.body.addedId) {
                req.body.city.shows = req.body.addedId.concat(shows);
            } else {
                req.body.city.shows = shows;
            }
            City.findByIdAndUpdate(req.params.id, req.body.city, {upsert: true, new: true}, function(err, updated) {
                if(err) {
                    req.flash("error", err.message);
                    return res.redirect("/cities/" + req.params.id);
                }
                req.flash("success", "City Updated.");
                res.redirect("/cities/" + req.params.id);
            });
        });
    }
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
