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

  // Creating Store for measurements
  measurementStoresDef(storeName);
  measurementStoresDef(storeNameClean);

  // Load measurement files to created store
  var store = qm.store(storeName);
  qm.load.jsonFile(store, fileListMeasures[i]);
}


// Open the first two stores
var testStore = qm.store(qm.getStoreList()[1].storeName);
var testStoreClean = qm.store(qm.getStoreList()[2].storeName);

testStoreClean.addTrigger({
  onAdd : Service.Mobis.Loop.makeCleanSpeedNoCars(testStoreClean)
});




var records = testStore.recs;

for (var ii=0; ii<records.length; ii++) {
  var rec = records[ii];
  var val = rec.toJSON();

  console.say("Ori: " + JSON.stringify(rec));

  delete val.$id; // when adding to QMiner, $id must not exist
  // add the join fields (different syntax)
  testStoreClean.joins.forEach(function(join) {
    val[join] = {$id: rec[join].$id};
  });
  // add value
  testStoreClean.add(val);

  console.say("New: " + JSON.stringify(testStoreClean.recs[ii]));
}

