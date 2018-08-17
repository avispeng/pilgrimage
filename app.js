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

// requiring routes
var cityRoutes  = require("./routes/cities"),
    showRoutes  = require("./routes/shows"),
    indexRoutes = require("./routes/index");
// seedDB(); // run everytiime

app.use(bodyParser.urlencoded({extended: true}));
app.use(expressSanitizer()); // make sure go after bodyParser
app.use(express.static(__dirname + "/public"));
app.set("view engine", "ejs");
app.use(methodOverride("_method"));

var upload = multer({ dest: 'tmp/' });

mongoose.connect("mongodb://localhost/pilgrimage"); // if no db called pilgrimage, create one

app.use("/cities", cityRoutes); // prepend /cities to each route
app.use(showRoutes);
app.use(indexRoutes);
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
