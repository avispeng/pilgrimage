var express          = require("express"),
    app              = express(),
    bodyParser       = require("body-parser"),
    mongoose         = require("mongoose"),
    fs               = require('fs'),
    multer           = require('multer'),
    methodOverride   = require("method-override"),
    expressSanitizer = require("express-sanitizer"),
    City             = require("./models/city"),
    Show             = require("./models/show"),
    seedDB           = require("./seeds");

// seedDB(); // run everytiime

app.use(bodyParser.urlencoded({extended: true}));
app.use(expressSanitizer()); // make sure go after bodyParser
app.use(express.static(__dirname + "/public"));
app.set("view engine", "ejs");
app.use(methodOverride("_method"));

var upload = multer({ dest: 'tmp/' });

mongoose.connect("mongodb://localhost/pilgrimage"); // if no db called pilgrimage, create one

app.get("/", function(req, res) {
    res.render("landing");
});

app.get("/cities", function(req, res) {
    City.find({}).populate("shows").exec(function(err, cities) {
        if(err) {
            res.render("error", {msg: "don't find any"});
        } else {
            res.render("cities/index", {headline: "Popular Cities", cities: cities});
        }
    });
});

app.post("/cities", upload.single('image'), function(req, res) {
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

app.get("/cities/new", function(req, res) {
    res.render("cities/new");
});

app.get("/cities/results", function(req, res) {
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

app.get("/cities/:id", function(req, res) {
    // details of one city: what shows are shot here
    // var id = req.params.id;
    City.findById(req.params.id, function(err, found) {
        if(err) {
            res.render("error", {msg : "there is no such city"});
        } else {
            res.render("cities/detail", {city: found});
        }
    });
});

app.get("/cities/:id/shows/new", function(req, res) {
    // add show to this city

});

app.get("/shows", function(req, res) {
    res.render("shows/index");
});

// app.post("/matching", upload.array(), function(req, res) {
//     var city = req.body.city;
//     var show = req.body.show;
//
//     res.render("success", {city: city, show: show});
// });
//
// app.get("/matching/new", function(req, res) {
//     res.render("new.ejs");
// });

app.listen(3000, "localhost", function() {
    console.log("The Pilgrimage Server Has Started!");
});
