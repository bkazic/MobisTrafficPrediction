// Module for Loop counters preprocessing


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
    var val = rec.toJSON();

    delete val.$id;
    val.StringDateTime = rec.DateTime.string;

    //add joins
    store.joins.forEach(function (join) {
        val[join] = { $id: rec[join].$id };
    });

    store.add(val);
};

// If there is no cars, set speed to speed limit
exports.makeCleanSpeedNoCars = function(outStore) {
	var store = outStore;
	function cleanSpeedNoCars(rec) {
		if (rec.NumOfCars === 0) {
			speed = rec.measuredBy.MaxSpeed;
			store.add({ $id: rec.$id, Speed: speed, TrafficStatus: 1 });
		}
	}
	return cleanSpeedNoCars;
};

// If there is no cars, set speed to speed limit
exports.makeAddMissingValues = function (outstore, addInterval) {
    var store = outstore;
    var interval = addInterval;
    var addMissingValues = function (rec) {
        if (rec.$id === 0) {
            return; // skip - no previous records
        }
        var sorted = store.recs;
        sorted.sortByField("DateTime", 1);
        var prevRec = sorted[rec.$id - 1]; // previous record in datetime
        // calculate the gap between the record being added and the previous one
        var timeDiff = rec.DateTime.timestamp - prevRec.DateTime.timestamp;
        // check if the gap is bigger than the interval at which values are supposed to be added
        if (timeDiff > interval) {
            var numMissing = parseInt(timeDiff / interval);
            for (var ii = 0; ii < numMissing; ii++) {
                var now = rec.DateTime; // current record time
                now.sub((numMissing - ii) * interval, "second"); // time of the missing record

                //TODO: Find rec from some time ago and replace wiht it, instead of prev val

                var val = prevRec.toJSON();
                delete val.$id;
                val.DateTime = now.string;
                val.StringDateTime = now.string;
                val.Missing= true;
                store.add(val);


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
    };
    return addMissingValues;
};

// About this module
exports.about = function() {
	var description = "This module contains functions for prreprocessing counter loop sensors.";
	return description;
};