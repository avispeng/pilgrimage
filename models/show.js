var mongoose = require("mongoose");

var showSchema = new mongoose.Schema({
    name: String,
    douban: String,
    intro: String,
    imageURL: String,
    views: Number
});

module.exports = mongoose.model("Show", showSchema);
