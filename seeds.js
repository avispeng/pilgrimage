var mongoose = require("mongoose");
var City = require("./models/city");

function seedDB() {
    City.remove({}, function(err) {
        if(err) {
            console.log(err);
        }
        console.log("removed cities!");
    });
    
}

module.exports = seedDB;
