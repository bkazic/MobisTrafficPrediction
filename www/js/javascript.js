var maxVals = 1000;

var lastTime = null;

var speedChart = null;
var speedChartCleaned = null;
var speedChartResampled = null;

var speedData = null;
var speedDataCleaned = null;
var speedDataResampled = null;

// get data from QMiner
function getHttp(path) {
    $.ajax(path, {
        dataType: 'json',
        success: function (data) {
            drawChart(data.records);
            console.log("sucessfuly fetched data");
        },
        error: function (jqXHR, status) {
            console.log('Failed to fetch data: ' + status);
        }
    });
}

function drawChart(data) {
    var options = {
        legend: {
            position: 'bottom'
        },
        explorer: {
            maxZoomOut: 1,
            maxZoomin: 0.1,
            keepInBounds: true
            //zoomDelta: 1.1
        }
        //displayAnnotations: false,
    };

    for (var i = 0; i < data.length; i++) {
        var rec = data[i];
        var date = new Date(rec.DateTime);

        //speedData.addRow([date, rec.Target, rec.SpeedLimit, rec.Ema1, rec.PrevValPred,
        //                  rec.AvrValPred, rec.LinregPred, rec.SvmrPred, rec.NNPred]);
        speedData.addRow([date, rec.Target, rec.LinregPred, rec.SvmrPred, rec.NNPred]);

        //errorData.addRow([date, rec.Target-rec.SpeedLimit, rec.Target-rec.PrevValPred, rec.Target-rec.AvrValPred,
        //                  rec.Target - rec.LinregPred, rec.Target - rec.SvmrPred, rec.Target - rec.NNPred]);
        errorData.addRow([date, rec.Target - rec.LinregPred, rec.Target - rec.SvmrPred, rec.Target - rec.NNPred]);

        //meanErrorData.addRow([date, rec.SpeedLimitMAE, rec.PrevValPredMAE, rec.AvrValPredMAE,
        //                      rec.LinregPredMAE, rec.SvmrPredMAE, rec.NNPredMAE]);
        meanErrorData.addRow([date, rec.LinregPredMAE, rec.SvmrPredMAE, rec.NNPredMAE]);

    }

    //var nRemove = speedData.getNumberOfRows() - maxVals;
    //if (nRemove > 0) {
    //    dataTable.removeRows(0, nRemove);
    //}

    //chart.clear();
    speedChart.draw(speedData, options);
    errorChart.draw(errorData, options);
    meanErrorChart.draw(meanErrorData, options);

}


function initialize() {
    speedChart = new google.visualization.LineChart(document.getElementById('chart_speed'));
    //speedChart = new google.visualization.AnnotationChart(document.getElementById('chart_speed'));
    errorChart = new google.visualization.LineChart(document.getElementById('chart_error'));
    meanErrorChart = new google.visualization.LineChart(document.getElementById('chart_meanError'));

    speedData = new google.visualization.DataTable();
    errorData = new google.visualization.DataTable();
    meanErrorData = new google.visualization.DataTable();

    speedData.addColumn('date', 'Date');
    speedData.addColumn('number', 'Target Speed');
    //speedData.addColumn('number', 'Speed Limit');
    //speedData.addColumn('number', 'EMA');
    //speedData.addColumn('number', 'Previous value');
    //speedData.addColumn('number', 'Average value');
    speedData.addColumn('number', 'Linear regression');
    speedData.addColumn('number', 'SVM regression');
    speedData.addColumn('number', 'Neural Networks');
    //speedData.addColumn('number', 'EMA');


    errorData.addColumn('date', 'Date');
    //errorData.addColumn('number', 'Speed Limit Error');
    //errorData.addColumn('number', 'Previous value Error');
    //errorData.addColumn('number', 'Average value Error');
    errorData.addColumn('number', 'LinReg Error');
    errorData.addColumn('number', 'SVMR Error');
    errorData.addColumn('number', 'NN Error');

    meanErrorData.addColumn('date', 'Date');
    //meanErrorData.addColumn('number', 'SpeedLimitMAE');
    //meanErrorData.addColumn('number', 'PrevValPredMAE');
    //meanErrorData.addColumn('number', 'AvrValPredMAE');
    meanErrorData.addColumn('number', 'LinReg MAE');
    meanErrorData.addColumn('number', 'SVMR MAE');
    meanErrorData.addColumn('number', 'NN MAE');
    
    getHttp('/sensors/query?data={"$from":"CounterMeasurement_0016_21_Resampled"}');
    //getHttp('/sensors/query?data={"$from":"CounterMeasurement_0016_21_Resampled","$offset":1000,"$limit":1000,"$sort":{"DateTime":-1}}');
    //getHttp('/sensors/query?data={"$from":"CounterMeasurement_0016_21_Resampled","$limit":100}');
    //getHttp('/sensors/query?data={"$from":"CounterMeasurement_0016_21_Resampled"}');
    //getHttp('/sensors/query?data={"$from":"CounterMeasurement_0016_21_Cleaned2"}');
    //getHttp('/sensors/query?data={"$from":"CounterMeasurement_0016_21"}', speedData, speedChart);
    //getHttp('/sensors/query?data={"$from":"CounterMeasurement_0016_21_Cleaned"}', speedDataCleaned, speedChartCleaned);
    //getHttp('/sensors/query?data={"$from":"CounterMeasurement_0016_21_Cleaned2"}', speedDataResampled, speedChartResampled);

}

google.load('visualization', '1.0', { 'packages': ['corechart'] });
//google.load('visualization', '1.1', { 'packages': ['annotationchart'] });
google.setOnLoadCallback(initialize);