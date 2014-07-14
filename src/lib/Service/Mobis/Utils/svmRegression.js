//////////// SVM REGRESSION 
function svmRegression(features, target, buffer, parameters) {
    this.target = target;
    this.bufferSize = typeof buffer !== 'undefined' ? buffer : -1;
    this.parameters = parameters;
    this.featureSpace = analytics.newFeatureSpace(features);
    this.model = initModel(this.featureSpace.dim);

    // buffer
    var bufferFun = function (rs, buff) {
        rs.sortById(-1);
        rs.trunc(buff);
        rs.sortById(1);
        //return rs
    }

    // update
    this.learn = function (records) {
        if (this.bufferSize > 0) { bufferFun(records, this.bufferSize); }
        this.featureSpace.updateRecords(records);
        var matrix = this.featureSpace.ftrSpColMat(records);
        var targetVec = la.newVec({ mxVals: records.length });
        for (var i = 0; i < records.length; i++) {
            targetVec.push(records[i][this.target.name]);
        }
        this.model = analytics.trainSvmRegression(matrix, targetVec, this.parameters);
    };

    // predict
    this.predict = function (record) {
        var vec = this.featureSpace.ftrSpVec(record);
        var result = this.model.predict(vec);
        return result;
    };

    // initialize model
    function initModel(dim) {
        var matrix = la.newMat({ "rows": dim, "cols": 1 });
        targetVec = la.newVec({ "vals": 1 })
        return analytics.trainSvmRegression(matrix, targetVec);
    }
    return this;
}

// Exposed method to creates new instance of svmr object
exports.newSvmRegression = function (features, target, buffer, parameters) {
    return new svmRegression(features, target, buffer, parameters);
}

// About this module
exports.about = function () {
    var description = "Online (fake) SVM regression method.";
    return description;
};