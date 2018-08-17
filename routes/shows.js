var express = require("express");
var router = express.Router();
var City = require("../models/city"),
    Show = require("../models/show");

router.get("/shows", function(req, res) {
    res.render("shows/index");
});

module.exports = router;
