var analytics = require('analytics');
//import "functions.js"
//printSomething("something");
var Service = {}; Service.Mobis = {}; Service.Mobis.Loop = require('Service/Mobis/Loop/functions.js');
console.say(Service.Mobis.Loop.about());

// Loading store for counter Nodes
var filename_counters_n = "./sandbox/sensors/countersNodes.txt";
var CounterNode = qm.store("CounterNode");
qm.load.jsonFile(CounterNode, filename_counters_n);

// Define measurement store definition as a function so that it can be used several times 
var measurementStoresDef = function (storeName, extraFields) {
   storeDef = [{
       "name" : storeName,
       "fields" : [
            { "name" : "DateTime", "type" : "datetime" },
            { "name" : "NumOfCars", "type" : "float", "null" : true },
            { "name" : "Gap", "type" : "float", "null" : true },
            { "name" : "Occupancy", "type" : "float", "null" : true },
            { "name" : "Speed", "type" : "float", "null" : true },
            { "name" : "TrafficStatus", "type" : "float", "null" : true }
        ],
        "joins" : [
            { "name" : "measuredBy", "type" : "field", "store" : "CounterNode" }
        ]
  }];
  if(extraFields) {
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
for (var i=0; i<fileListMeasures.length; i++) {
  // Creating name for stores
  var storeName = "CounterMeasurement"+measurementIds[i];
  var storeNameClean = storeName + "_Cleaned";
  var storeNameResampled = storeName + "_Resampled";

  // Creating Store for measurements
  measurementStoresDef(storeName);
  measurementStoresDef(storeNameClean);
  measurementStoresDef(storeNameResampled, [{ "name" : "Ema1", "type" : "float", "null" : true },
                                            { "name" : "Ema2", "type" : "float", "null" : true },
                                            { "name" : "Prediction", "type" : "float", "null" : true}]);

  // Load measurement files to created store
  var store = qm.store(storeName);
  qm.load.jsonFile(store, fileListMeasures[i]);
}



// Open the first two stores
var testStore = qm.store(qm.getStoreList()[1].storeName);
var testStoreClean = qm.store(qm.getStoreList()[2].storeName);
var testStoreResampled = qm.store(qm.getStoreList()[3].storeName);

// Here addNoDuplicateValues should be added later
// testStore.addTrigger({
//   onAdd : 
// });

// Calls function that cleanes speed when no cars are detected
testStoreClean.addTrigger({
  onAdd : Service.Mobis.Loop.makeCleanSpeedNoCars(testStoreClean)
});

// This resample aggregator creates new resampled store
testStoreClean.addStreamAggr({ name: "Resample1min", type: "resampler",
  outStore: testStoreResampled.name, timestamp: "DateTime",
  fields: [ { name: "NumOfCars", interpolator: "previous" },
            { name: "Gap", interpolator: "previous" },
            { name: "Occupancy", interpolator: "previous" },
            { name: "Speed", interpolator: "previous" },
            { name: "TrafficStatus", interpolator: "previous" } ],
  createStore: false, interval: 60*1000 });

// insert testStoreResampled store aggregates
testStoreResampled.addStreamAggr({ name: "tick", type: "timeSeriesTick",
                                   timestamp: "DateTime", value: "Speed" });
testStoreResampled.addStreamAggr({ name: "Ema1", type: "ema", inAggr: "tick", 
                                  emaType: "previous", interval: 2000*1000, initWindow: 600*1000 });
testStoreResampled.addStreamAggr({ name: "Ema2", type: "ema", inAggr: "tick", 
                                  emaType: "previous", interval: 10000*1000, initWindow: 600*1000 });


// Buffer defines for how many records infront prediction will be learned
testStoreResampled.addStreamAggr({ name: "delay", type: "recordBuffer", size: 6});


// Define feature space
var ftrSpace = analytics.newFeatureSpace([
  { type: "numeric", source: testStoreResampled.name, field: "Speed" },
  { type: "numeric", source: testStoreResampled.name, field: "Ema1" },
  { type: "numeric", source: testStoreResampled.name, field: "Ema2" },
  { type: "multinomial", source: testStoreResampled.name, field: "DateTime", datetime: true }
]);



// initialize linear regression
var linreg = analytics.newRecLinReg({ "dim": ftrSpace.dim, "forgetFact":1.0 });

var sumError = 0;
var mean = 0;
// Defines what
testStoreResampled.addTrigger({
  onAdd: function (rec) {
    var ema1 = testStoreResampled.getStreamAggr("Ema1").EMA;
    var ema2 = testStoreResampled.getStreamAggr("Ema2").EMA;
    testStoreResampled.add({ $id: rec.$id, Ema1: ema1, Ema2: ema2 });

    var prediction = linreg.predict(ftrSpace.ftrVec(rec));

    var trainRecId = testStoreResampled.getStreamAggr("delay").last;

    if (trainRecId > 0) {
      testStoreResampled.add({ $id: rec.$id, Prediction: prediction });
      linreg.learn(ftrSpace.ftrVec(testStoreResampled[trainRecId]), rec.Speed);
    }

    // check prediction
    var diff = Math.round(Math.abs(rec.Speed - testStoreResampled[trainRecId].Prediction) * 1000) / 1000;
    console.log("Diff: " + diff + ", Value: " + rec.Speed + ", Prediction: " + testStoreResampled[trainRecId].Prediction);

    // doesent make sense, because at the start the error is to large
    if (testStoreResampled.length < 10) {return;}
    sumError += diff;
    console.say(testStoreResampled.length.toString() + " and " + JSON.stringify(testStoreResampled.length-9) + " and " + sumError);
    mean = sumError / (testStoreResampled.length-9);
    console.log("Total error: " + mean);
  }
});


// Testing out
var records = testStore.recs;
for (var ii=0; ii<records.length; ii++) {
  var rec = records[ii];
  //console.say("Ori: " + JSON.stringify(rec));
  Service.Mobis.Loop.addNoDuplicateValues(testStoreClean, rec);
  //console.say("New: " + JSON.stringify(testStoreClean.recs[testStoreClean.length-1]));
}

//Just for testing
for (var jj=0; jj<testStoreResampled.length; jj++) {
  var rec = testStoreResampled.recs[jj];
  //console.say(JSON.stringify(rec));
}


// print for validation of prediction
var totalMeanError = 0;
var count = 0;
for(var ii = 0; ii < testStoreClean.recs.length; ii++) {
  var rec = testStoreClean.recs[ii]; // real value
  var comparable = testStoreResampled.recs; // predicted value
  comparable.filterByField("DateTime", rec.DateTime.string);
  if(!comparable) { count++; continue; };
  if(comparable.length === 0) { count++; console.say(JSON.stringify(rec)); continue; };
  var pred = comparable[0].Prediction;
  var diff = Math.round(Math.abs(rec.Speed - pred) * 1000) / 1000;
  console.say("diff = " + diff);
  totalMeanError += diff;
}
totalMeanError /= testStoreClean.recs.length - count;
console.say("total = " + totalMeanError);
console.say("count = " + count);
