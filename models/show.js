var mongoose = require("mongoose");

var showSchema = new mongoose.Schema({
    name: String,
    douban: String,
    intro: String,
    imageURL: String,
    // cities: [{
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: "City"
    // }]
});

module.exports = mongoose.model("Show", showSchema);
