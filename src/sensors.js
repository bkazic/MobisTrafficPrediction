var analytics = require('analytics');
var assert = require('assert.js');
//import "functions.j
var Service = {}; Service.Mobis = {}; Service.Mobis.Utils = {};
Service.Mobis.Utils.RidgeRegression = require('Service/Mobis/Utils/ridgeRegression.js');
Service.Mobis.Loop = require('Service/Mobis/Loop/preproc.js');
Service.Mobis.Utils.Stat = require('Service/Mobis/Utils/stat.js');
Service.Mobis.Utils.Io = require('Service/Mobis/Utils/io.js');
console.say(Service.Mobis.Loop.about());
console.say(Service.Mobis.Utils.Stat.about());
console.say(Service.Mobis.Utils.Io.about());

//Test

// Loading store for counter Nodes
var filename_counters_n = "./sandbox/sensors/countersNodes.txt";
var CounterNode = qm.store("CounterNode");
qm.load.jsonFile(CounterNode, filename_counters_n);

// Define measurement store definition as a function so that it can be used several times 
var measurementStoresDef = function (storeName, extraFields) {
    storeDef = [{
        "name": storeName,
        "fields": [
             { "name": "DateTime", "type": "datetime" },
             { "name": "NumOfCars", "type": "float", "null": true },
             { "name": "Gap", "type": "float", "null": true },
             { "name": "Occupancy", "type": "float", "null": true },
             { "name": "Speed", "type": "float", "null": true },
             { "name": "TrafficStatus", "type": "float", "null": true }
        ],
        "joins": [
            { "name": "measuredBy", "type": "field", "store": "CounterNode" }
        ]
    }];
    if (extraFields) {
        storeDef[0].fields = storeDef[0].fields.concat(extraFields);
    }
    qm.createStore(storeDef);
};

// Find measurement files
var fileList = fs.listFile("./sandbox/sensors/","txt");
var keyWord = "measurements_"; // Keyword, by which to find files
var fileListMeasures = fileList.filter( function(element) {return element.indexOf(keyWord) >= 0;}); // Find files with keyword in name
var measurementIds = fileListMeasures.map( function(element) {return element.substring(element.length-12,element.length-4);}); // Extract IDs from file names

// Load measurement files to stores
for (var i = 0; i < fileListMeasures.length; i++) {
    // Creating name for stores
    var storeName = "CounterMeasurement" + measurementIds[i];
    var storeNameClean = storeName + "_Cleaned";
    var storeNameClean2 = storeName + "_Cleaned2";
    var storeNameResampled = storeName + "_Resampled";

    // Creating Store for measurements
    measurementStoresDef(storeName);
    measurementStoresDef(storeNameClean, [{ "name": "StringDateTime", "type": "string", "primary": true }]);
    measurementStoresDef(storeNameClean2, [{ "name": "StringDateTime", "type": "string", "primary": true },
                                           { "name": "TargetDateTime", "type": "string", "null": true },
                                           { "name": "Missing", "type": "bool", "null": true }]);
    //measurementStoresDef(storeNameResampled, [{ "name": "Ema1", "type": "float", "null": true },
    //                                          { "name": "Ema2", "type": "float", "null": true },
    //                                          { "name": "Prediction", "type": "float", "null": true }]);
    //

    // adding fields for historical values
    var extraFields = [{ "name": "Ema1", "type": "float", "null": true },
                       { "name": "Ema2", "type": "float", "null": true },
                       { "name": "Prediction", "type": "float", "null": true }]
    for (var ii = 0; ii < 10; ii++) {
        extraFields.push({ "name": "HistVal"+(ii+1), "type": "float", "null": true })
    };
    measurementStoresDef(storeNameResampled, extraFields);

    // Load measurement files to created store
    var store = qm.store(storeName);
    qm.load.jsonFile(store, fileListMeasures[i]);
}


// Open the first two stores
var testStore = qm.store(qm.getStoreList()[1].storeName);
var testStoreClean = qm.store(qm.getStoreList()[2].storeName);
var testStoreClean2 = qm.store(qm.getStoreList()[3].storeName);
var testStoreResampled = qm.store(qm.getStoreList()[4].storeName);

// Here addNoDuplicateValues should be added later
// testStore.addTrigger({
//   onAdd : 
// });

// Calls function that cleanes speed when no cars are detected
testStoreClean.addTrigger({
  onAdd : Service.Mobis.Loop.makeCleanSpeedNoCars(testStoreClean)
});

// Calls function that adds missing values
var interval = 5 * 60; // timestamp specified in seconds
testStoreClean.addTrigger({
    onAdd: Service.Mobis.Loop.makeAddMissingValues(testStoreClean, interval, testStoreClean2, 1, "day")
});

// This resample aggregator creates new resampled store
testStoreClean2.addStreamAggr({
    name: "Resample1min", type: "resampler",
    outStore: testStoreResampled.name, timestamp: "DateTime",
    fields: [{ name: "NumOfCars", interpolator: "previous" },
              { name: "Gap", interpolator: "previous" },
              { name: "Occupancy", interpolator: "previous" },
              { name: "Speed", interpolator: "previous" },
              { name: "TrafficStatus", interpolator: "previous" }],
    createStore: false, interval: 10 * 60 * 1000
});

// insert testStoreResampled store aggregates
testStoreResampled.addStreamAggr({ name: "tick", type: "timeSeriesTick",
                                   timestamp: "DateTime", value: "Speed" });
testStoreResampled.addStreamAggr({ name: "Ema1", type: "ema", inAggr: "tick",
                                  emaType: "previous", interval: 30*60*1000, initWindow: 600*1000 });
testStoreResampled.addStreamAggr({ name: "Ema2", type: "ema", inAggr: "tick",
                                  emaType: "previous", interval: 120*60*1000, initWindow: 600*1000 });

// Buffer defines for how many records infront prediction will be learned
testStoreResampled.addStreamAggr({ name: "delay", type: "recordBuffer", size: 2 });

// Buffer for historical features
var histVals = 3;
var histValName = [];
for (var jj = 0; jj < histVals; jj++) {
    histValName[jj] = "HistVal" + (jj + 1);
    testStoreResampled.addStreamAggr({ name: histValName[jj], type: "recordBuffer", size: jj + 2 });
};


// feature extractors for feature space
var featureExtractors = [
  { type: "numeric", source: testStoreResampled.name, field: "Speed" },
  { type: "numeric", source: testStoreResampled.name, field: "Ema1" },
  { type: "numeric", source: testStoreResampled.name, field: "Ema2" },
  { type: "multinomial", source: testStoreResampled.name, field: "DateTime", datetime: true }
]

// add historical features
for (var ii = 0; ii < histValName.length; ii++) {
    featureExtractors.push({ type: "numeric", source: testStoreResampled.name, field: histValName[ii] });
}

// Define feature space
var ftrSpace = analytics.newFeatureSpace(featureExtractors);

//// Define feature space
//var ftrSpace = analytics.newFeatureSpace([
//  { type: "numeric", source: testStoreResampled.name, field: "Speed" },
//  { type: "numeric", source: testStoreResampled.name, field: "Ema1" },
//  { type: "numeric", source: testStoreResampled.name, field: "Ema2" },
//  { type: "multinomial", source: testStoreResampled.name, field: "DateTime", datetime: true }
//]);

// initialize linear regression
var linreg = analytics.newRecLinReg({ "dim": ftrSpace.dim, "forgetFact":1.0 });

// Initialize ridge regression. Input parameters: regularization factor, dimension, buffer.
//console.say(Service.Mobis.Utils.RidgeRegression.about());
//var ridgeRegression = new Service.Mobis.Utils.RidgeRegression.ridgeRegression(0.003, ftrSpace.dim, 100);

//var outFile = fs.openAppend("./sandbox/sensors/test/newtest5min.txt");

testStoreResampled.addTrigger({
    onAdd: function (rec) {
        var ema1 = testStoreResampled.getStreamAggr("Ema1").EMA;
        var ema2 = testStoreResampled.getStreamAggr("Ema2").EMA;
        testStoreResampled.add({ $id: rec.$id, Ema1: ema1, Ema2: ema2 });

        //for (var ii = 0; ii < histValName.length; ii++) {
        //    testStoreResampled.add({ $id: rec.$id, histVal[ii]: testStoreResampled.getStreamAggr(histVal).oldest.Speed });
        //};

        // add historical features
        histValName.forEach(function (histVal) {
            rec[histVal] = testStoreResampled.getStreamAggr(histVal).oldest.Speed;
            testStoreResampled.add({ $id: rec.$id });
        });

        //var prediction = ridgeRegression.predict(ftrSpace.ftrVec(rec));

        //var fVec = ftrSpace.ftrVec(rec);
        //histValName.forEach(function (histVal) {
        //    fVec.push(testStoreResampled.getStreamAggr(histVal).oldest.Speed);
        //})

        var prediction = linreg.predict(ftrSpace.ftrVec(rec));
        testStoreResampled.add({ $id: rec.$id, Prediction: prediction });

        var trainRecId = testStoreResampled.getStreamAggr("delay").first;

        //console.startx(function (x) { return eval(x); })

        if (trainRecId > 0) {
            linreg.learn(ftrSpace.ftrVec(testStoreResampled[trainRecId]), rec.Speed);
            //ridgeRegression.addupdate(ftrSpace.ftrVec(testStoreResampled[trainRecId]), rec.Speed);

            //console.log("Train: " + testStoreResampled[trainRecId].DateTime.string + ", Pred: " + rec.DateTime.string);
            //console.log("FtrVec: " + ftrSpace.ftrVec(testStoreResampled[trainRecId]).print())

            // to get parameters from model
            // var model = ridgeRegression.getModel();
            // model.print();

            // var trainVector = ftrSpace.ftrVec(testStoreResampled[trainRecId]);
            // trainVector.push(rec.Speed);
            // trainVector.print(); console.say("\n");

            // var Xstr = Service.Mobis.Utils.Io.printStr(trainVector);
            // outFile.writeLine(Xstr);
        }

        // check prediction
        var diff = Math.round(Math.abs(rec.Speed - testStoreResampled[trainRecId].Prediction) * 1000) / 1000;
        console.log("Diff: " + diff + ", Value: " + rec.Speed + ", Prediction: " + testStoreResampled[trainRecId].Prediction);

        //doesent make sense, because at the start the error is to large
        if (testStoreResampled.length < 10) { return; }
        var mean = Service.Mobis.Utils.Stat.onlineMeanError(diff);
        console.log("Total error: " + mean);
    }
});
//outFile.flush();

// Testing out
for (var ii=0; ii<testStore.length; ii++) {
  var rec = testStore.recs[ii];
  //console.say("Ori: " + JSON.stringify(rec));
  Service.Mobis.Loop.addNoDuplicateValues(testStoreClean, rec);
  //Service.Mobis.Loop.cleanSpeedNoCars(testStoreClean, rec);
  //console.say("New: " + JSON.stringify(testStoreClean.recs[testStoreClean.length-1]));
}

//Just for testing
//for (var jj=0; jj<testStoreClean.length; jj++) {
//  var rec = testStoreClean.recs[jj];
//  console.say(JSON.stringify(rec));
//}

// //Just for testing
// for (var jj=0; jj<testStoreResampled.length; jj++) {
//   var rec = testStoreResampled.recs[jj];
//   console.say(JSON.stringify(rec));
// }

var meanErr = Service.Mobis.Utils.Stat.meanError(testStoreClean.recs, testStoreResampled.recs);
console.say("Ajga! Mean error: " + meanErr);


// ONLINE SERVICES

//http://localhost:8080/sensors/query?data={"$from":"SensorMeasurement"}
//http://localhost:8080/sensors/query?data={"$from":"CounterMeasurement_0016_21_Cleaned","$sort":{"DateTime":1}}
http.onGet("query", function (req, resp) {
    jsonData = JSON.parse(req.args.data);
    console.say("" + JSON.stringify(jsonData));
    var recs = qm.search(jsonData);
    return http.jsonp(req, resp, recs);
});

////http://localhost:8080/sensors/getRawStore
//http.onGet("getRawStore", function (req, resp) {
//    var storeName = testStore.name;
//    var recs = qm.search({ "$from": storeName });
//    return http.jsonp(req, resp, recs);
//});

////http://localhost:8080/sensors/getCleanedStore
//http.onGet("getCleanedStore", function (req, resp) {
//    var storeName = testStoreClean.name;
//    var recs = qm.search({ "$from": storeName });
//    recs.sortByField("DateTime", 1);
//    return http.jsonp(req, resp, recs);
//});