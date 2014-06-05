// Module for Loop counters preprocessing
tm = require('time');

//exports.addNoDuplicateValues = function(outStore, rec) {
//	var store = outStore;
//	var val = rec.toJSON();
//	var result = outStore.recs;

//	result.filterByField("DateTime", rec.DateTime.string);
//	if(typeof result != 'undefined') {
//		if(result.hasOwnProperty("length")) { // checks if object has the specified property
//			if(result.length > 0) {
//				return; // do not add
//			}
//		}
//	}

//	delete val.$id; // when adding to QMiner, $id must not exist
//	// add the join fields (different syntax)
//	store.joins.forEach(function(join) {
//		val[join] = {$id: rec[join].$id};
//	});
//	// add value
//	store.add(val);
//};

exports.addNoDuplicateValues = function (outStore, rec) {
    var store = outStore;

    

    var val = rec.toJSON(true);
    //console.say(JSON.stringify(val));
    //var test = store.newRec(val);
    //console.startx(function (x) { return eval(x); })

    delete val.$id;
    val.StringDateTime = rec.DateTime.string;

    ////add joins
    //store.joins.forEach(function (join) {
    //    val[join] = { $id: rec[join].$id };
    //});

    store.add(val);
};

// If there is no cars, set speed to speed limit
exports.makeCleanSpeedNoCars = function (outStore) {
    var store = outStore;
    function cleanSpeedNoCars(rec) {
        if (rec.NumOfCars === 0) {
            speed = rec.measuredBy.MaxSpeed;
            store.add({ $id: rec.$id, Speed: speed, TrafficStatus: 1 });
        }
    }
    return cleanSpeedNoCars;
};

//// If there is no cars, set speed to speed limit
//exports.makeAddMissingValues = function (outstore, addInterval) {
//    var store = outstore;
//    var interval = addInterval;
//    var addMissingValues = function (rec) {
//        if (rec.$id === 0) {
//            return; // skip - no previous records
//        }
//        var sorted = store.recs;
//        sorted.sortByField("DateTime", 1);
//        var prevRec = sorted[rec.$id - 1]; // previous record in datetime
//        // calculate the gap between the record being added and the previous one
//        var timeDiff = rec.DateTime.timestamp - prevRec.DateTime.timestamp;
//        // check if the gap is bigger than the interval at which values are supposed to be added
//        if (timeDiff > interval) {
//            var numMissing = parseInt(timeDiff / interval);
//            for (var ii = 0; ii < numMissing; ii++) {
//                var now = rec.DateTime; // current record time
//                now.sub((numMissing - ii) * interval, "second"); // time of the missing record

//                var val = prevRec.toJSON();
//                delete val.$id;
//                val.DateTime = now.string;
//                val.StringDateTime = now.string;
//                val.Missing = true;
//                store.add(val);

//            }
//        }
//    };
//    return addMissingValues;
//};

// If there is no cars, set speed to speed limit
exports.makeAddMissingValues = function (inputStore, addInterval, outputStore, valsBack, unit) {
    var inStore = inputStore;
    var interval = addInterval;
    var outStore = outputStore;

    var addMissingValues = function (rec) {

        //create json rec
        var val = rec.toJSON(true); 
        delete val.$id;
        //store.joins.forEach(function (join) {
        //    val[join] = { $id: rec[join].$id };
        //});

        // skip - no previous records
        if (rec.$id === 0) {
            outStore.add(val);
            return; 
        }

        // calculate the gap between the record being added and the previous one
        var sorted = inStore.recs;
        //sorted.sortByField("DateTime", 1); // takes too much time, I think I dont need it anymore with aditional store Cleaned2
        var prevRec = sorted[rec.$id - 1]; // previous record in datetime 
        var timeDiff = rec.DateTime.timestamp - prevRec.DateTime.timestamp;

        // check if the gap is bigger than the interval at which values are supposed to be added
        if (timeDiff > interval) {
            var numMissing = parseInt(timeDiff / interval) - 1;
            for (var ii = numMissing; ii > 0; ii--) {
                var recs = inStore.recs;
                var now = rec.DateTime; // current record time
                now.sub(ii * interval, "second"); // time of the missing record

                // initialize target rec
                var targetRec = prevRec;
                var targetVal = targetRec.toJSON(true);

                // if parameters are not initialized target val will be prev val
                if (valsBack && unit) { // checks if parameters are initialized
                    var targetTime = tm.parse(now.string);
                    // targetTime.sub(1, "hour"); // specify target time
                    targetTime.sub(valsBack, unit); // specify target time

                    // find rec
                    recs.filterByField("DateTime", targetTime.string, targetTime.string); // BUG in filterByField??
                    //console.startx(function (x) { return eval(x); })
                    if (recs.length) {
                        targetRec = recs[0];
                        targetVal = targetRec.toJSON(true);
                    }
                }

                // add val
                delete targetVal.$id;
                targetVal.DateTime = now.string;
                targetVal.StringDateTime = now.string;
                targetVal.TargetDateTime = targetRec.DateTime.string;
                targetVal.Missing = true;
                outStore.add(targetVal);

                //// get predicted value
                //var prediction = null;
                //var predTime = now.sub(6, "min"); // @TODO hack must fix -
                //var records = resampledStore.recs;
                //records.filterByField("DateTime", now.string);
                //if (typeof records != "undefined") {
                //    if (records.length > 0) {
                //        var target = records[0];
                //        if (target.Prediction) {
                //            prediction = target.Prediction;
                //        }
                //    }
                //}
                //if (prediction !== null) {
                //    store.add({ DateTime: now.string, Speed: prediction, Missing: true }); // add missing record
                //}
                //else {
                //    store.add({ DateTime: now.string, Missing: true }); // add missing recordP
                //}
            }
        }
        outStore.add(val);
    };
    return addMissingValues;
};

// About this module
exports.about = function () {
    var description = "This module contains functions for prreprocessing counter loop sensors.";
    return description;
};