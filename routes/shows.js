var express = require("express");
var router = express.Router();
var City = require("../models/city"),
    Show = require("../models/show");
var fs = require('fs');
var multer = require('multer');
var middlewareObj = require("../middleware");
var Promise = require("bluebird");
// var AsyncLock = require('async-lock');
// var lock = new AsyncLock();

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

var views = {};

function updateViews() {
    var toUpdate = views;
    views = {};
    // use bluebird here to apply update parallely and asynchronously so that event loop won't be blocked
    Promise.map(Object.keys(toUpdate), function(id) {
        Show.findByIdAndUpdate(id, {$inc : {'views' : toUpdate[id]}}, {new: true}).exec(function(err, updated) {
            console.log(id + " show updated to " + updated['views']);
        });
    });
}

var timer = setInterval(updateViews, 3600000);

router.get("/shows", function(req, res) {
    var perPage = 16;
    var pageQuery = parseInt(req.query.page);
    var pageNumber = pageQuery ? pageQuery : 1;

    Show.find({}).sort({views: -1}).skip((perPage * pageNumber) - perPage).limit(perPage).exec(function(err, shows) {
        Show.countDocuments().exec(function(err, count) {
            if(err) {
                req.flash("error", err.message);
                res.redirect("/shows");
            } else {
                res.render("shows/index", {
                    headline: "Popular Shows",
                    shows: shows,
                    title: "Shows - Pilgrimage",
                    current: pageNumber,
                    pages: Math.ceil(count / perPage),
                    query: null
                });
            }
        });
    });
});

// new show form
router.get("/shows/new", middlewareObj.isLoggedIn, function(req, res) {
    res.render("shows/new", {title: "New Show - Pilgrimage"});
});

// add a new show
router.post("/shows", middlewareObj.isLoggedIn, upload.single('image'), function(req, res) {
    // var isAjaxRequest = req.xhr;

    // if(!req.file) {
    //     var targetPath = "public/default-thumbnail.jpg";
    // } else {
    //     if(!req.file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
    //         // console.log("wrong file type");
    //         req.flash("error", "Invalid file format. Please upload a valid image.");
    //         return res.redirect("/shows/new");
    //     }
    //     var tmpPath = req.file.path;
    //     var targetPath = "public/show-images/" + Date.now() + '-' + req.file.originalname;
    //     fs.rename(tmpPath, targetPath, function(err) {
    //         if(err) {
    //             req.flash("error", err.message);
    //             // return res.redirect("/shows/new");
    //         }
    //         // fs.unlink(tmpPath, function(err) {
    //         //     if(err) {
    //         //         req.flash("error", err.message);
    //         //         // return res.redirect("/shows/new");
    //         //     }
    //         // });
    //     });
    // }
    if(!req.file) {
        console.log('no file');
        req.body.show.imageURL = "/default-poster.png";
        Show.findOneAndUpdate({'douban': req.body.show.douban}, req.body.show, {upsert: true, new: true}, function(err, show) {
            if(err) {
                req.flash("error", err.message);
                return res.redirect("/shows/new");
            }
            console.log("show added");
            req.flash("success", "Show added.");
            return res.redirect("/shows/" + show._id);
        });
    } else {
        // console.log(req.file);
        // console.log(req.body);
        // return res.status(200).json({url: null});
        console.log(req.file.originalname);
        if(!req.file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
            // console.log("wrong file type");
            req.flash("error", "Invalid file format. Please upload a valid image.");
            // return res.redirect("/shows/new");
            return res.status(200).json({url: null});
        }
        cloudinary.uploader.upload(req.file.path, function(result) {
            req.body.show.imageURL = result.secure_url;
            Show.findOneAndUpdate({'douban': req.body.show.douban}, req.body.show, {upsert: true, new: true}, function(err, show) {
                if(err) {
                    req.flash("error", err.message);
                    // return res.redirect("/shows/new");
                    return res.status(200).json({url: null});
                }
                console.log("show added");
                req.flash("success", "Show added.");
                return res.status(200).json({url: "/shows/" + show._id});
                // res.redirect("/shows/" + show._id);
            });
        });
    }
    // req.body.show.imageURL = targetPath.slice(6);
});

// searching results
router.get("/shows/results", function(req, res) {
    var perPage = 16;
    var pageQuery = parseInt(req.query.page);
    var pageNumber = pageQuery ? pageQuery : 1;

    var query = req.query.show;
    if(query && query.length > 0) {
        const regex = new RegExp(escapeRegex(query), 'gi');
        Show.find({name: regex}).skip((perPage * pageNumber) - perPage).limit(perPage).exec(function(err, shows) {
            Show.countDocuments({name: regex}).exec(function(err, count) {
                if(err) {
                    req.flash("error", err.message);
                    res.redirect("/shows");
                } else {
                    res.render("shows/index", {
                        headline: "Searching Results",
                        shows: shows,
                        title: "Shows - Pilgrimage",
                        current: pageNumber,
                        pages: Math.ceil(count / perPage),
                        query: query
                    });
                }
            });
        });
    } else {
        res.redirect("/shows");
    }
});

// detail page of one show
router.get("/shows/:id", function(req, res) {
    // var id = req.params.id;
    Show.findById(req.params.id, function(err, found) {
        if(err) {
            req.flash("error", err.message);
            res.redirect("back");
        } else if(!found) {
            req.flash("error", "Can't find the show.");
            res.redirect("/shows");
        } else {
            views[req.params.id] = (views[req.params.id] || 0) + 1; // increase page views
            console.log(req.params.id + ": " + views[req.params.id]);
            // find all cities where this show is shot.
            City.find({shows: req.params.id}).sort({views: -1}).exec(function(err, cities) {
                if(err) {
                    req.flash("error", err.message);
                    return res.redirect('back');
                }
                res.render("shows/detail", {show: found, cities: cities, title: found.name + " - Pilgrimage"});
            })
        }
    });
});

// Edit
router.get("/shows/:id/edit", middlewareObj.isLoggedIn, function(req, res) {
    Show.findById(req.params.id, function(err, found) {
        if(err) {
            req.flash("error", err.message);
            res.redirect("/shows/" + req.params.id);
        } else if(!found) {
            req.flash("error", "Can't find the show.");
            res.redirect("/shows");
        } else {
            res.render("shows/edit", {show: found, title: "Edit - Pilgrimage"});
        }
    });
});

// update
router.put("/shows/:id", middlewareObj.isLoggedIn, upload.single('image'), function(req, res) {
    // can wrap things up in one object in ejs file
    // if we have more complicated situation
    // better handle the array and build a new object
    // var city = ...
    // var show = req.body.show;
    // if(req.file) {
    //     if(!req.file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
    //         req.flash("error", "Invalid file format. Please upload a valid image.");
    //         return res.redirect("/shows/" + req.params.id + "/edit");
    //     }
    //     var tmpPath = req.file.path;
    //     var targetPath = "public/show-images/" + Date.now() + '-' + req.file.originalname;
    //     fs.rename(tmpPath, targetPath, function(err) {
    //         if(err) {
    //             req.flash("error", err.message);
    //         }
    //         // better delete original image if there is one
    //     });
    //     show.imageURL = targetPath.slice(6);
    // }
    if(req.file) {
        if(!req.file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
            // console.log("wrong file type");
            req.flash("error", "Invalid file format. Please upload a valid image.");
            return res.status(200).json({url: null});
            // return res.redirect("/shows/" + req.params.id + "/edit");
        }
        cloudinary.uploader.upload(req.file.path, function(result) {
            req.body.show.imageURL = result.secure_url;
            Show.findByIdAndUpdate(req.params.id, req.body.show, function(err, updated) {
                if(err) {
                    req.flash("error", err.message);
                    // res.redirect("/shows/" + req.params.id);
                    return res.status(200).json({url: "/shows/" + req.params.id});
                } else if(!updated) {
                    Show.findOneAndUpdate({douban: show.douban}, req.body.show, {upsert: true, new: true}, function(err, updated) {
                        if(err) {
                            req.flash("error", err.message);
                            // return res.redirect("/shows");
                            return res.status(200).json({url: "/shows"});
                        }
                        req.flash("success", "Can't find the show. Created one.");
                        // res.redirect("/shows/" + updated._id);
                        return res.status(200).json({url: "/shows/" + updated._id});
                    });
                } else {
                    req.flash("success", "Show Updated.");
                    // res.redirect("/shows/" + req.params.id);
                    return res.status(200).json({url: "/shows/" + req.params.id});
                }
            });
        });
    } else {
        Show.findByIdAndUpdate(req.params.id, req.body.show, function(err, updated) {
            if(err) {
                req.flash("error", err.message);
                res.redirect("/shows/" + req.params.id);
            } else if(!updated) {
                Show.findOneAndUpdate({douban: show.douban}, show, {upsert: true, new: true}, function(err, updated) {
                    if(err) {
                        req.flash("error", err.message);
                        return res.redirect("/shows");
                    }
                    req.flash("success", "Can't find the show. Created one.");
                    res.redirect("/shows/" + updated._id);
                });
            } else {
                req.flash("success", "Show Updated.");
                res.redirect("/shows/" + req.params.id);
            }
        });
    }
});

// helper functions
function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};


module.exports = router;
