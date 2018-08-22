var mongoose = require("mongoose");

var matchSchema = new mongoose.Schema({
    cityId: String,
    cityName: String,
    address: String,
    cityPhoto: String,
    showId: String,
    showName: String,
    showScreenshot: String,
    description: String
});

module.exports = mongoose.model("Match", matchSchema);
