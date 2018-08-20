var express = require("express");
var router = express.Router();
var City = require("../models/city"),
    Show = require("../models/show");
var fs = require('fs');
var multer = require('multer');
var middlewareObj = require("../middleware");
var upload = multer({ dest: 'tmp/' });

router.get("/shows", function(req, res) {
    Show.find({}, function(err, shows) {
        if(err) {
            req.flash("error", err.message);
            res.redirect("/shows");
        } else {
            res.render("shows/index", {headline: "Popular Shows", shows: shows});
        }
    });
});

// new show form
router.get("/shows/new", middlewareObj.isLoggedIn, function(req, res) {
    res.render("shows/new");
});

// add a new show
router.post("/shows", middlewareObj.isLoggedIn, upload.single('image'), function(req, res) {
    if(!req.file) {
        var targetPath = "public/default-thumbnail.jpg";
    } else {
        if(!req.file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
            // console.log("wrong file type");
            req.flash("error", "Invalid file format. Please upload a valid image.");
            return res.redirect("/shows/new");
        }
        var tmpPath = req.file.path;
        var targetPath = "public/show-images/" + Date.now() + '-' + req.file.originalname;
        fs.rename(tmpPath, targetPath, function(err) {
            if(err) {
                req.flash("error", err.message);
                // return res.redirect("/shows/new");
            }
            // fs.unlink(tmpPath, function(err) {
            //     if(err) {
            //         req.flash("error", err.message);
            //         // return res.redirect("/shows/new");
            //     }
            // });
        });
    }
    req.body.show.imageURL = targetPath.slice(6);
    // if exists, update it
    Show.findOneAndUpdate({'douban': req.body.show.douban}, req.body.show, {upsert: true, new: true}, function(err, show) {
        if(err) {
            req.flash("error", err.message);
            return res.redirect("/shows/new");
        }

        console.log("show added");

        req.flash("success", "Show added.");
        res.redirect("/shows/" + show._id);
    });
});

// searching results
router.get("/shows/results", function(req, res) {
    var query = req.query.show;
    if(query && query.length > 0) {
        const regex = new RegExp(escapeRegex(query), 'gi');
        Show.find({name: regex}, function(err, shows) {
            if(err) {
                req.flash("error", err.message);
                res.redirect("/shows");
            } else {
                res.render("shows/index", {headline: "Searching Results", shows: shows});
            }
        });
    } else {
        Show.find({}, function(err, shows) {
            if(err) {
                req.flash("error", err.message);
                res.redirect("/shows");
            } else {
                res.render("shows/index", {headline: "Searching Results", shows: shows});
            }
        });
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
            res.render("shows/detail", {show: found});
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
            res.render("shows/edit", {show: found});
        }
    });
});

// update
router.put("/shows/:id", middlewareObj.isLoggedIn, upload.single('image'), function(req, res) {
    // can wrap things up in one object in ejs file
    // if we have more complicated situation
    // better handle the array and build a new object
    // var city = ...
    var show = req.body.show;
    if(req.file) {
        if(!req.file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
            req.flash("error", "Invalid file format. Please upload a valid image.");
            return res.redirect("/shows/" + req.params.id + "/edit");
        }
        var tmpPath = req.file.path;
        var targetPath = "public/show-images/" + Date.now() + '-' + req.file.originalname;
        fs.rename(tmpPath, targetPath, function(err) {
            if(err) {
                req.flash("error", err.message);
            }
            // better delete original image if there is one
        });
        show.imageURL = targetPath.slice(6);
    }
    Show.findByIdAndUpdate(req.params.id, show, function(err, updated) {
        if(err) {
            req.flash("error", err.message);
            res.redirect("/shows/" + req.params.id);
        } else if(!updated) {
            Show.findOneAndUpdate({douban: show.douban}, show, {upsert: true, new: true}, function(err, updated) {
                if(err) {
                    req.flash("error", err.message);
                    res.redirect("/shows");
                }
                req.flash("success", "Can't find the show. Created one.");
                res.redirect("/shows/" + updated._id);
            });
        } else {
            req.flash("success", "Show Updated.");
            res.redirect("/shows/" + req.params.id);
        }
    });
});

// helper functions
function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};


module.exports = router;
