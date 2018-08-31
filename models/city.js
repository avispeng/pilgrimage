var mongoose = require("mongoose");
var Show = require("./show");

var citySchema = new mongoose.Schema({
    name: String,
    country: String,
    imageURL: String,
    bannerURL: String,
    intro: String,
    shows: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Show"
    }]
});

module.exports = mongoose.model("City", citySchema);
