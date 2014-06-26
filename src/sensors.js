var analytics = require('analytics.js');
var assert = require('assert.js');
var tm = require('time')
var utilities = require('utilities.js');

// Create instance for stop watch
sw = new utilities.clsStopwatch();
sw2 = new utilities.clsStopwatch();

// Import modules from lib
var Service = {}; Service.Mobis = {}; Service.Mobis.Utils = {};
Service.Mobis.Utils.RidgeRegression = require('Service/Mobis/Utils/ridgeRegression.js');
Service.Mobis.Loop = require('Service/Mobis/Loop/preproc.js');
Service.Mobis.Utils.Stat = require('Service/Mobis/Utils/stat.js');
Service.Mobis.Utils.Baseline = require('Service/Mobis/Utils/stat.js')
Service.Mobis.Utils.Io = require('Service/Mobis/Utils/io.js');
Service.Mobis.Utils.Ftr = require('Service/Mobis/Utils/featureExtractor.js');
Service.Mobis.Utils.Svmr = require('Service/Mobis/Utils/svmRegression.js');

// Print module descriptions
console.say(Service.Mobis.Loop.about());
console.say(Service.Mobis.Utils.Stat.about());
console.say(Service.Mobis.Utils.Io.about());
console.say(Service.Mobis.Utils.Ftr.about());
console.say(Service.Mobis.Utils.Svmr.about());

// Create instance of imported module
var speedLimitMAE = Service.Mobis.Utils.Stat.newMeanAbsoluteError();
var avrValMAE = Service.Mobis.Utils.Stat.newMeanAbsoluteError();
var prevValMAE = Service.Mobis.Utils.Stat.newMeanAbsoluteError();
var linregMAE = Service.Mobis.Utils.Stat.newMeanAbsoluteError();
var ridgeRegMAE = Service.Mobis.Utils.Stat.newMeanAbsoluteError();
var svmrMAE = Service.Mobis.Utils.Stat.newMeanAbsoluteError();
var nnMAE = Service.Mobis.Utils.Stat.newMeanAbsoluteError();

// Constructor for special days feature extractor
var slovenianHolidayFtr = new Service.Mobis.Utils.Ftr.specialDaysFtrExtractor("Slovenian_holidays");
var fullMoonFtr = new Service.Mobis.Utils.Ftr.specialDaysFtrExtractor("Full_moon");

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
    var extraFields = [{ "name": "Target", "type": "float", "null": true, "default": 0.0 },
                       { "name": "Ema1", "type": "float", "null": true },
                       { "name": "Ema2", "type": "float", "null": true },

                       { "name": "SpeedLimit", "type": "float", "null": true },
                       { "name": "PrevValPred", "type": "float", "null": true },
                       { "name": "AvrValPred", "type": "float", "null": true },
                       { "name": "LinregPred", "type": "float", "null": true },
                       { "name": "RidgeRegPred", "type": "float", "null": true },
                       { "name": "SvmrPred", "type": "float", "null": true },
                       { "name": "NNPred", "type": "float", "null": true },

                       { "name": "SpeedLimitMAE", "type": "float", "null": true },
                       { "name": "PrevValPredMAE", "type": "float", "null": true },
                       { "name": "AvrValPredMAE", "type": "float", "null": true },
                       { "name": "LinregPredMAE", "type": "float", "null": true },
                       { "name": "RidgeRegPredMAE", "type": "float", "null": true },
                       { "name": "SvmrPredMAE", "type": "float", "null": true },
                       { "name": "NNPredMAE", "type": "float", "null": true },

                       { "name": "PredictionDateTime", "type": "datetime", "null": true },
                       { "name": "WasPredicted", "type": "float", "null": true },
                       { "name": "Error", "type": "float", "null": true },
                       { "name": "MeanError", "type": "float", "null": true }
    ]
    for (var ii = 0; ii < 10; ii++) {
        extraFields.push({ "name": "HistVal"+(ii+1), "type": "float", "null": true })
    };
    measurementStoresDef(storeNameResampled, extraFields);

    // Load measurement files to created store
    var store = qm.store(storeName);
    qm.load.jsonFile(store, fileListMeasures[i]);
}


// Open stores
// Index has to go from 2 on, because specialDaysFtrExtractor inserts the first one
var testStore = qm.store(qm.getStoreList()[2].storeName);
var testStoreClean = qm.store(qm.getStoreList()[3].storeName);
var testStoreClean2 = qm.store(qm.getStoreList()[4].storeName);
var testStoreResampled = qm.store(qm.getStoreList()[5].storeName);

// Here addNoDuplicateValues should be added later
// testStore.addTrigger({
//   onAdd : 
// });

var avr = Service.Mobis.Utils.Baseline.newAvrVal();
// Calls function that cleanes speed when no cars are detected
//testStoreClean.addTrigger({
//    onAdd: Service.Mobis.Loop.makeCleanSpeedNoCars(testStoreClean, avr.getAvr())
//});

testStoreClean.addTrigger({
    onAdd: function (rec) {
        if (rec.NumOfCars === 0) {
            rec.Speed = avr.getAvr();
        }
    }
});

// Calls function that adds missing values
var interval = 5 * 60; // timestamp specified in seconds
testStoreClean.addTrigger({
    onAdd: Service.Mobis.Loop.makeAddMissingValues(testStoreClean, interval, testStoreClean2, 1, "week")
    //onAdd: Service.Mobis.Loop.makeAddMissingValues(testStoreClean, interval, testStoreClean2)
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
    createStore: false, interval: 60 * 60 * 1000
});

// insert testStoreResampled store aggregates
testStoreResampled.addStreamAggr({ name: "tick", type: "timeSeriesTick",
                                   timestamp: "DateTime", value: "Speed" });
testStoreResampled.addStreamAggr({ name: "Ema1", type: "ema", inAggr: "tick",
                                  emaType: "previous", interval: 30*60*1000, initWindow: 10*60*1000 });
testStoreResampled.addStreamAggr({ name: "Ema2", type: "ema", inAggr: "tick",
                                  emaType: "previous", interval: 120*60*1000, initWindow: 10*60*1000 });

// Buffer defines for how many records infront prediction will be learned
testStoreResampled.addStreamAggr({ name: "delay", type: "recordBuffer", size: 2 });

// Buffer for historical features
var histVals = 3;
var histValName = [];
for (var jj = 0; jj < histVals; jj++) {
    histValName[jj] = "HistVal" + (jj + 1); //name has to start with 1
    testStoreResampled.addStreamAggr({ name: histValName[jj], type: "recordBuffer", size: jj + 2 }); //if size is 2, this is the first hist val
};

// feature extractors for feature space
var featureExtractors = [
  { type: "constant", source: testStoreResampled.name, val: 1 }, 
  { type: "jsfunc", source: testStoreResampled.name, fun: slovenianHolidayFtr.getFtr },
  { type: "jsfunc", source: testStoreResampled.name, fun: fullMoonFtr.getFtr },
  { type: "numeric", source: testStoreResampled.name, field: "Speed" },
  { type: "numeric", source: testStoreResampled.name, field: "NumOfCars" },
  { type: "numeric", source: testStoreResampled.name, field: "Gap" },
  { type: "numeric", source: testStoreResampled.name, field: "Occupancy" },
  { type: "numeric", source: testStoreResampled.name, field: "TrafficStatus" },
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

//// initialize prediction methods
//var avr = Service.Mobis.Utils.Baseline.newAvrVal();
var ridgeRegression = new analytics.ridgeRegression(10000, ftrSpace.dim, 100);
//var linreg = analytics.newRecLinReg({ "dim": ftrSpace.dim, "forgetFact": 0.98, "regFact": 10000 });
var linreg = analytics.newRecLinReg({ "dim": ftrSpace.dim, "forgetFact":1.0 });
var svmr = Service.Mobis.Utils.Svmr.newSvmRegression(featureExtractors, testStoreResampled.field("Target"), 100, { "c": 2.0, "eps": 1.0 });
var NN = analytics.newNN({ "layout": [ftrSpace.dim, 4, 1], "tFuncHidden": "sigmoid", "tFuncOut": "linear", "learnRate": 0.2, "momentum": 0.2 });

// Initialize ridge regression. Input parameters: regularization factor, dimension, buffer.
//console.say(Service.Mobis.Utils.RidgeRegression.about());
//var ridgeRegression = new Service.Mobis.Utils.RidgeRegression.ridgeRegression(0.003, ftrSpace.dim, 100);
//var ridgeRegression = new Service.Mobis.Utils.RidgeRegression.ridgeRegression(0.003, ftrSpace.dim);

var onlineMean = new Service.Mobis.Utils.Stat.meanError();

sw.tic();
sw2.tic();
var prevRecDay = null;

//var outFile = fs.openAppend("./sandbox/sensors/test/newtest5min.txt");
testStoreResampled.addTrigger({
    onAdd: function (rec) {
        rec.Ema1 = testStoreResampled.getStreamAggr("Ema1").EMA;
        rec.Ema2 = testStoreResampled.getStreamAggr("Ema2").EMA;

        // add historical features
        histValName.forEach(function (histVal) {
            rec[histVal] = testStoreResampled.getStreamAggr(histVal).oldest.Speed;
        });

        // Predict and add to rec
        rec.SpeedLimit = 50;
        rec.PrevValPred = rec.Speed;
        rec.AvrValPred = avr.getAvr();
        rec.LinregPred = linreg.predict(ftrSpace.ftrVec(rec));
        rec.RidgeRegPred = ridgeRegression.predict(ftrSpace.ftrVec(rec));
        rec.SvmrPred = svmr.predict(rec);
        rec.NNPred = NN.predict(ftrSpace.ftrVec(rec)).at(0);

        // training record
        var trainRecId = testStoreResampled.getStreamAggr("delay").first;

        // Add target for batch method
        testStoreResampled.add({ $id: trainRecId, Target: rec.Speed });

        if (trainRecId > 0) {
            // update models
            linreg.learn(ftrSpace.ftrVec(testStoreResampled[trainRecId]), rec.Speed);
            ridgeRegression.addupdate(ftrSpace.ftrVec(testStoreResampled[trainRecId]), rec.Speed);
            NN.learn(ftrSpace.ftrVec(testStoreResampled[trainRecId]), la.newVec([rec.Speed]));
            avr.update(testStoreResampled[trainRecId].Speed);

            var rs = testStoreResampled.recs;
            rs.filterById(0, trainRecId);
            svmr.learn(rs);

            //console.log("Train: " + testStoreResampled[trainRecId].DateTime.string + ", Pred: " + rec.DateTime.string);
            //console.log("FtrVec: " + ftrSpace.ftrVec(testStoreResampled[trainRecId]).print())

            // add time of prediction
            var predictionHorizon = rec.DateTime.timestamp - testStoreResampled[trainRecId].DateTime.timestamp;
            var predictionForTime = tm.parse(rec.DateTime.string);
            predictionForTime.add(predictionHorizon);
            testStoreResampled.add({ $id: rec.$id, PredictionDateTime: predictionForTime.string });
            //console.startx(function (x) { return eval(x); })

            // to get parameters from model
            // var model = ridgeRegression.getModel();
            // model.print();

            // var trainVector = c
            // trainVector.push(rec.Speed);
            // trainVector.print(); console.say("\n");

            // var Xstr = Service.Mobis.Utils.Io.printStr(trainVector);
            // outFile.writeLine(Xstr);

            // TOJ BLO PREJ NOT. POMOJE TO ZDJ NE RABS
            //var wasPredicted = testStoreResampled[trainRecId].Prediction
            //var diff = Math.round(Math.abs(rec.Speed - wasPredicted) * 1000) / 1000;
            //onlineMean.update(diff)

            //testStoreResampled.add({ $id: rec.$id, WasPredicted: wasPredicted, Error: diff, MeanError: onlineMean.getMean() });

            //// skip first few iterations because the error of svmr is to high
            if (rec.$id > 30) {
                // Calculate mean
                speedLimitMAE.update(rec.Speed - testStoreResampled[trainRecId].SpeedLimit)
                avrValMAE.update(rec.Speed - testStoreResampled[trainRecId].AvrValPred);
                prevValMAE.update(rec.Speed - testStoreResampled[trainRecId].Speed);
                linregMAE.update(rec.Speed - testStoreResampled[trainRecId].LinregPred);
                ridgeRegMAE.update(rec.Speed - testStoreResampled[trainRecId].RidgeRegPred);
                svmrMAE.update(rec.Speed - testStoreResampled[trainRecId].SvmrPred);
                nnMAE.update(rec.Speed - testStoreResampled[trainRecId].NNPred);
            }
        }
        // Write errors to store
        rec.SpeedLimitMAE = speedLimitMAE.getError();
        rec.PrevValPredMAE = avrValMAE.getError();
        rec.AvrValPredMAE = prevValMAE.getError();
        rec.LinregPredMAE = linregMAE.getError();
        rec.RidgeRegPredMAE = ridgeRegMAE.getError();
        rec.SvmrPredMAE = svmrMAE.getError();
        rec.NNPredMAE = nnMAE.getError();

        if (rec.DateTime.day != prevRecDay) {
            sw2.toc("Leap time");
            sw2.tic();
            console.log("Working on rec: " + rec.DateTime.dateString);
            // check prediction

            //console.log("Diff: " + diff + ", Value: " + rec.Speed + ", Prediction: " + testStoreResampled[trainRecId].Prediction);

            //if (testStoreResampled.length < 10) { return; }
            //var mean = Service.Mobis.Utils.Stat.onlineMeanError(diff);

            console.log("Speed:" + rec.Speed);
            console.log("SpeedLimit: " + 50.0);
            console.log("AvrVal: " + testStoreResampled[trainRecId].AvrValPred);
            console.log("PrevVal: " + testStoreResampled[trainRecId].PrevValPred);
            console.log("LinReg: " + testStoreResampled[trainRecId].LinregPred);
            console.log("RidgeReg: " + testStoreResampled[trainRecId].RidgeRegPred);
            console.log("Svmr: " + testStoreResampled[trainRecId].SvmrPred);
            console.log("NN: " + testStoreResampled[trainRecId].NNPred + "\n");

            // Write errors to console
            console.log("Working with rec: " + rec.$id);
            console.log("SpeedLimit MAE Error: " + speedLimitMAE.getError());
            console.log("AvrVal MAE Error: " + avrValMAE.getError());
            console.log("PrevVal MAE Error: " + prevValMAE.getError());
            console.log("LinReg MAE Error: " + linregMAE.getError());
            console.log("RidgeReg MAE Error: " + ridgeRegMAE.getError());
            console.log("Svmr MAE Error: " + svmrMAE.getError());
            console.log("NN MAE Error: " + nnMAE.getError() + "\n");

            // set new prevRecDay
            prevRecDay = rec.DateTime.day;
        }
    }
});
//outFile.flush();

// Testing out
for (var ii=0; ii<testStore.length; ii++) {
  var rec = testStore.recs[ii];
  Service.Mobis.Loop.addNoDuplicateValues(testStoreClean, rec);
}

//var meanErr = Service.Mobis.Utils.Stat.meanError(testStoreClean.recs, testStoreResampled.recs);
//var meanErr = Service.Mobis.Utils.Stat.validateSpeedPrediction(testStoreClean.recs, testStoreResampled.recs);
console.log("Calculating real mean error...");
var meanErr = Service.Mobis.Utils.Stat.validateSpeedPrediction(testStoreResampled, testStoreClean);
console.log("Ajga parjato! Mean error: " + meanErr);
sw.toc("Time");

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