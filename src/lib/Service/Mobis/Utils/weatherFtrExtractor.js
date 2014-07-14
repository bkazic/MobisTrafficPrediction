// Define measurement store definition as a function so that it can be used several times 
var createMeasurementStore = function (storeName, extraFields) {
    storeDef = [{
        "name": storeName,
        "fields": [
                { "name": "time", "type": "datetime" },
                { "name": "timeString", "type": "string", "null": true},
                { "name": "summary", "type": "string", "null": true },
                { "name": "icon", "type": "string", "null": true },
                { "name": "temperature", "type": "float", "null": true },
                { "name": "visibility", "type": "float", "null": true },
        ],
        "keys": [
                { "field": "timeString", "type": "value" }
        ]
    }];
    if (extraFields) {
        storeDef[0].fields = storeDef[0].fields.concat(extraFields);
    }
    qm.createStore(storeDef);
};

var extraFields = [{ "name": "clearDay", "type": "float", "null": true },
                   { "name": "clearNight", "type": "float", "null": true },
                   { "name": "rain", "type": "float", "null": true },
                   { "name": "snow", "type": "float", "null": true },
                   { "name": "sleet", "type": "float", "null": true },
                   { "name": "wind", "type": "float", "null": true },
                   { "name": "fog", "type": "float", "null": true },
                   { "name": "cloudy", "type": "float", "null": true },
                   { "name": "partlyCloudyDay", "type": "float", "null": true },
                   { "name": "parltlyCloudyNight", "type": "float", "null": true }]

// Creating Store for measurements
createMeasurementStore("load");
createMeasurementStore("raw", extraFields);
createMeasurementStore("resampled", extraFields);

// Load measurements from file to store
var scriptNm = process.scriptNm;
var loadStore = qm.store('load');
var filename_measurements = "./sandbox/" + scriptNm + "/weatherLog.txt";
qm.load.jsonFile(loadStore, filename_measurements);

var rawStore = qm.store('raw');
var resampledStore = qm.store('resampled');

resampleStore = function (intervalNum) {
    // This resample aggregator creates new resampled store
    rawStore.addStreamAggr({
        name: "Resampler", type: "resampler",
        outStore: resampledStore.name, timestamp: "time",
        fields: [{ name: "temperature", interpolator: "previous" },
                 { name: "visibility", interpolator: "previous" },
                 { name: "clearDay", interpolator: "previous" },
                 { name: "clearNight", interpolator: "previous" },
                 { name: "rain", interpolator: "previous" },
                 { name: "snow", interpolator: "previous" },
                 { name: "sleet", interpolator: "previous" },
                 { name: "wind", interpolator: "previous" },
                 { name: "fog", interpolator: "previous" },
                 { name: "cloudy", interpolator: "previous" },
                 { name: "partlyCloudyDay", interpolator: "previous" },
                 { name: "parltlyCloudyNight", interpolator: "previous" }],
        createStore: false, interval: intervalNum
    });

    resampledStore.addTrigger({
        onAdd: function (rec) {
            // Have to update timeString if it gets resampled
            rec.timeString = rec.time.string;
        }
    });

    // I have to reload records so that the trigers and aggregates will be triggered
    for (var ii = 0; ii < loadStore.length; ii++) {
        var rec = loadStore.recs[ii];
        var val = rec.toJSON(true);
        delete val.$id;
        //add timeString
        val.timeString = rec.time.string;
        val.clearDay = rec.icon === "clear-day" ? 1 : 0;
        val.clearNight = rec.icon === "clear-night" ? 1 : 0;
        val.rain = rec.icon === "rain" ? 1 : 0;
        val.snow = rec.icon === "snow" ? 1 : 0;
        val.sleet = rec.icon === "sleet" ? 1 : 0;
        val.wind = rec.icon === "wind" ? 1 : 0;
        val.fog = rec.icon === "fog" ? 1 : 0;
        val.cloudy = rec.icon === "cloudy" ? 1 : 0;
        val.partlyCloudyDay = rec.icon === "partly-cloudy-day" ? 1 : 0;
        val.parltlyCloudyNight = rec.icon === "partly-cloudy-night" ? 1 : 0;
        rawStore.add(val);
    }
}


weatherFeatureExtractor = function (interval, store) {
    resampleStore(interval);
    store = typeof store !== 'undefined' ? store : resampledStore;

    // Private function to find data by key
    findRec = function (key) {
        var result = qm.search({ $from: store.name, timeString: key });

        if (result.length == 1) 
            return result[0];
        else
            console.log("Error", "Did not find correct weather data match.")
            return false
    }

    this.getTemperature = function (rec) {
        key = rec.DateTime.string;
        //console.log("key: " + key);
        var hit = findRec(key);
        //console.log("result: " + JSON.stringify(hit));
        return hit.temperature;
    }

    this.getVisibility = function (rec) {
        key = rec.DateTime.string;
        var hit = findRec(key);
        return hit.visibility;
    }

    this.getClearDay = function (rec) {
        key = rec.DateTime.string;
        var hit = findRec(key);
        return hit.clearDay;
    }

    this.getClearNight = function (rec) {
        key = rec.DateTime.string;
        var hit = findRec(key);
        return hit.clearNight;
    }

    this.getRain = function (rec) {
        key = rec.DateTime.string;
        var hit = findRec(key);
        return hit.rain;
    }

    this.getSnow = function (rec) {
        key = rec.DateTime.string;
        var hit = findRec(key);
        return hit.snow;
    }

    this.getSleet = function (rec) {
        key = rec.DateTime.string;
        var hit = findRec(key);
        return hit.sleet;
    }

    this.getWind = function (rec) {
        key = rec.DateTime.string;
        var hit = findRec(key);
        return hit.wind;
    }

    this.getFog = function (rec) {
        key = rec.DateTime.string;
        var hit = findRec(key);
        return hit.fog;
    }

    this.getCloudy = function (rec) {
        key = rec.DateTime.string;
        var hit = findRec(key);
        return hit.cloudy;
    }

    this.getPartlyCloudyDay = function (rec) {
        key = rec.DateTime.string;
        var hit = findRec(key);
        return hit.partlyCloudyDay;
    }

    this.getParltlyCloudyNight = function (rec) {
        key = rec.DateTime.string;
        var hit = findRec(key);
        return hit.parltlyCloudyNight;
    }

}

// Exports this module
exports.newWeatherFeatureExtracotr = function (interval, store) {
    return new weatherFeatureExtractor(interval, store);
}

// About this module
exports.about = function () {
    var description = "Module contains functions for weather feature extractors defined in weatherLog.txt.";
    return description;
};