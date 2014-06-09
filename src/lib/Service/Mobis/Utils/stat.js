
//var count = 0;
//var sumErr = 0;
//function simpleMeanError(err) {
//	count++;
//	sumErr += err;
//	var mean = sumErr/count;
//	return mean;
//}

//exports.onlineMeanError = function(err) {
//	return simpleMeanError(err);
//};

//exports.meanError = function(testSet, compareSet) {
//	var meanError = -1;
//	for (var ii=0; ii<testSet.length; ii++) {
//		var rec = testSet[ii];
//		var comparable = compareSet;
//		comparable.filterByField("DateTime", rec.DateTime.string);
//		if (!comparable) { count++; continue; }
//		if (comparable.length===0) {count++; continue; }
//		var pred = comparable[0].Prediction;
//		var diff = Math.round(Math.abs(rec.Speed - pred) * 1000) / 1000;
//		meanError = simpleMeanError(diff);
//		//console.say("Mean error: " + meanError);
//	}
//	return meanError;
//};

exports.meanError = function () {
    this.count = 0;
    this.sumErr = 0;
    this.mean = -1;
    // incremental update mean error
    this.update = function (err) {
        this.sumErr += err;
        this.count++;
        this.calcMean();
        return this.mean;
    }
    // calculate mean error
    this.calcMean = function () {
        this.mean = this.sumErr/this.count;
    }
    // batch version
    this.getMean = function () {
        return this.mean;
    }
}

//exports.validateSpeedPrediction = function (testStore, compareStore) {
//    var notValid = 0;
//    var totalMeanError = 0;
//    var testSet = testStore.recs;
//    var meanError = new exports.meanError();
//    for (var ii = 0; ii < testSet.length; ii++) {
//        var rec = testSet[ii];
//        var comparable = compareStore.recs;
//        comparable.filterByField("DateTime", rec.DateTime.string, rec.DateTime.string);
//        if (!comparable) { notValid++; continue; }
//        if (comparable.length === 0) { notValid++; console.log("didnt find any!"); continue; }
//        var pred = comparable[0].Prediction;
//        var diff = Math.round(Math.abs(rec.Speed - pred) * 1000) / 1000;
//        meanError.update(diff);
//        //console.say("Mean error: " + meanError);
//    }
//    totalMeanError /= testStoreClean.recs.length - notValid;
//    console.log("test mean: ", totalMeanError.toString());
//    return meanError.getMean();
//}

exports.validateSpeedPrediction = function (testStore, compareStore) {
    var notValid = 0;
    var totalMeanError = 0;
    var testSet = testStore.recs;
    var meanError = new exports.meanError();
    for (var ii = 0; ii < testSet.length; ii++) {
        var rec = testSet[ii];
        if (rec.PredictionDateTime === null) { notValid++; continue; }
        //console.startx(function (x) { return eval(x); })
        var comparable = compareStore.recs;
        comparable.filterByField("DateTime", rec.PredictionDateTime.string, rec.PredictionDateTime.string);
        if (!comparable) { notValid++; console.log("ups"); continue; }
        //if (comparable.length === 0) { notValid++; console.log("didnt find: " + rec.PredictionDateTime.string); continue; }
        if (comparable.length === 0) { notValid++; continue; }
        var speed = comparable[0].Speed;
        var diff = Math.round(Math.abs(rec.Prediction - speed) * 1000) / 1000;
        meanError.update(diff);
        totalMeanError += diff;
        //console.say("Mean error: " + meanError);
    }
    totalMeanError /= testStore.length - notValid;
    console.log("test mean: ", totalMeanError.toString());
    //console.startx(function (x) { return eval(x); })
    return meanError.getMean();
}

// About this module
exports.about = function () {
    var description = "Module with statistics functions for evaluation.";
    return description;
};