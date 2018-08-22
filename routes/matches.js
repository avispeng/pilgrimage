var express = require("express");
var router = express.Router({mergeParams: true});
var fs = require('fs');
var multer = require('multer');
var City = require("../models/city"),
    Show = require("../models/show"),
    Match = require("../models/match");
var middlewareObj = require("../middleware");
var NodeGeocoder = require('node-geocoder');

var options = {
  provider: 'google',
  httpAdapter: 'https',
  apiKey: process.env.GEOCODER_API_KEY,
  formatter: null
};

var geocoder = NodeGeocoder(options);

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
    // check file format
    if(req.files && (req.files[0] && !req.files[0].originalname.match(/\.(jpg|jpeg|png|gif)$/) ||
    req.files[1] && !req.files[1].originalname.match(/\.(jpg|jpeg|png|gif)$/))) {
        req.flash("error", "Invalid file format. Please upload valid images");
        res.redirect("back");
    }
    req.body.match.showId = req.params.showId;
    req.body.match.cityId = req.params.cityId;
    City.findOne({_id: req.params.cityId, shows: req.params.showId}, function(err, city) {
        if(err) {
            req.flash("error", err.message);
            res.redirect("back");
        } else if(!city) {
            req.flash("error", "Can't find the city, show or match.");
            res.redirect("/cities");
        } else {
            geocoder.geocode(req.body.match.address + " " + city.name + " " + city.country, function (err, data) {
              if (err || !data.length) {
                req.flash('error', 'Invalid address');
                return res.redirect('back');
              }
              req.body.match.lat = data[0].latitude;
              req.body.match.lng = data[0].longitude;
              req.body.match.address = data[0].formattedAddress;
              // create the record first and then add image fields and save
              Match.create(req.body.match, function(err, match) {
                  if(err) {
                      req.flash("error", err.message);
                      return res.redirect("/cities/" + req.params.cityId + "/shows/" + req.params.showId);
                  }
                  // process image uploading
                  if(!req.files || req.files.length == 0 || !req.files[0] && !req.files[1]) {
                      // neither photo or screenshot are uploaded
                      match.cityPhoto = "/default-thumbnail.jpg";
                      match.showScreenshot = "/default-thumbnail.jpg";
                      match.save(function(err) {
                          if(err) {
                              req.flash("error", err.message);
                              return res.redirect("/cities/" + match.cityId + "/shows/" + match.showId);
                          }
                          res.redirect("/cities/" + match.cityId + "/shows/" + match.showId);
                      });
                  } else {
                      var screenshot = req.files[0];
                      var photo = req.files[1];
                      if(screenshot) {
                          cloudinary.uploader.upload(screenshot.path, function(result) {
                              match.showScreenshot = result.secure_url;
                              if(photo) {
                                  cloudinary.uploader.upload(photo.path, function(result) {
                                      match.cityPhoto = result.secure_url;
                                      match.save(function(err) {
                                          if(err) {
                                              req.flash("error", err.message);
                                              return res.redirect("/cities/" + match.cityId + "/shows/" + match.showId);
                                          }
                                          res.redirect("/cities/" + match.cityId + "/shows/" + match.showId);
                                      });
                                  });
                              } else {
                                  match.cityPhoto = "/default-thumbnail.jpg";
                                  match.save(function(err) {
                                      if(err) {
                                          req.flash("error", err.message);
                                          return res.redirect("/cities/" + match.cityId + "/shows/" + match.showId);
                                      }
                                      res.redirect("/cities/" + match.cityId + "/shows/" + match.showId);
                                  });
                              }
                          });
                      } else {
                          // only photo
                          match.showScreenshot = "/default-thumbnail.jpg";
                          cloudinary.uploader.upload(photo.path, function(result) {
                              match.cityPhoto = result.secure_url;
                              match.save(function(err) {
                                  if(err) {
                                      req.flash("error", err.message);
                                      return res.redirect("/cities/" + match.cityId + "/shows/" + match.showId);
                                  }
                                  res.redirect("/cities/" + match.cityId + "/shows/" + match.showId);
                              });
                          });
                      }
                  }
              });
            });
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
            req.flash("error", "Can't find the Record.");
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
            req.flash("error", "Can't find the Record.");
            return res.redirect("back");
        }
        res.render("matches/image", {title: "Show Screenshot", imageURL: found.showScreenshot});
    });
});

router.get("/matches/:id/map", function(req, res) {
    Match.findById(req.params.id, function(err, found) {
        if(err) {
            req.flash("error", err.message);
            return res.redirect("back");
        } else if(!found) {
            req.flash("error", "Can't find the Record.");
            return res.redirect("back");
        }
        res.render("matches/map", {title: "Map", match: found});
    });
});

module.exports = router;
