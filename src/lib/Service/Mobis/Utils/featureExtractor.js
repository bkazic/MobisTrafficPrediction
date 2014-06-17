// import time library
var tm = require('time');

// create store definition
var storeDef = [{
    "name": "specialDays",
    "fields": [
     { "name": "Key", "type": "string" },
     { "name": "DateString", "type": "string" }
    ],
    "keys": [
     { "field": "Key", "type": "value" },
     { "field": "DateString", "type": "value" }
    ]
}];
qm.createStore(storeDef);

// loads holidays to store
var specialDaysFile = "./sandbox/sensors/specialDays.txt";
var specialDaysStore = qm.store('specialDays');
qm.load.jsonFile(specialDaysStore, specialDaysFile);

exports.specialDaysFtrExtractor = function (key, store) {
    store = typeof store !== 'undefined' ? store : specialDaysStore;
    // check if key exists

    //console.startx(function (x) { return eval(x); })

    if (qm.search({ $from: store.name, Key: key }).length == 0) {
        console.log('warning','key in specialDaysFtrExtractor not found.')
    };
    // extract holiday features
    this.holidayFtr = function (recDate, store, key) {
        var recs = qm.search({ $from: store.name, DateString: recDate, Key: key });
        return ftrVal = recs.length !== 0 ? 1 : 0;
    };
    // getter for feature
    this.getFtr = function (rec) {
        var recDate = rec.DateTime.dateString;
        return this.holidayFtr(recDate, store, key);
    };
}

// About this module
exports.about = function () {
    var description = "This module contains functions for calendar feature extractors defined in specialDays.txt.";
    return description;
};