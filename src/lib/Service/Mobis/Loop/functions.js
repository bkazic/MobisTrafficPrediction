// Module for Loop counters preprocessing

exports.makeCleanSpeedNoCars = function(outStore) {
	var store = outStore;
	function cleanSpeedNoCars(rec) {
		if (rec.NumOfCars === 0) {
			speed = rec.measuredBy.MaxSpeed;
			store.add({$id:rec.$id, Speed:speed});
		}
	}
	return cleanSpeedNoCars;
};

// About this module
exports.about = function() {
	var description = "This module contains functions for prreprocessing counter loop sensors.";
	return description;
};