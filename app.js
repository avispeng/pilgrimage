var express               = require("express"),
    app                   = express(),
    bodyParser            = require("body-parser"),
    mongoose              = require("mongoose"),
    passport              = require("passport"),
    LocalStrategy         = require("passport-local"),
    passportLocalMongoose = require("passport-local-mongoose"),
    fs                    = require('fs'),
    multer                = require('multer'),
    flash                 = require("connect-flash"),
    methodOverride        = require("method-override"),
    expressSanitizer      = require("express-sanitizer"),
    City                  = require("./models/city"),
    Show                  = require("./models/show"),
    User                  = require("./models/user"),
    seedDB                = require("./seeds");

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
app.use(flash());

// passport configuration
app.use(require("express-session")({
    secret: "the best people in life are free",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req, res, next){
    res.locals.currentUser = req.user;
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    next();
});


var upload = multer({ dest: 'tmp/' });

mongoose.connect(process.env.DATABASEURL || "mongodb://localhost/pilgrimage"); // if no db called pilgrimage, create one

// app.use("/cities", cityRoutes); // prepend /cities to each route
app.use(cityRoutes);
app.use(showRoutes);
app.use(indexRoutes);

app.listen(process.env.PORT || 3000, process.env.IP || "localhost", function() {
    console.log("The Pilgrimage Server Has Started!");
});
