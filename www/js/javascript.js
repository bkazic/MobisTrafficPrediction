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
        legend: { position: 'bottom' }
    };

    for (var i = 0; i < data.length; i++) {
        var rec = data[i];
        var date = new Date(rec.DateTime);

        speedData.addRow([date, rec.Speed, rec.WasPredicted, rec.Ema1]);
        errorData.addRow([date, rec.Error]);
        meanErrorData.addRow([date, rec.MeanError]);

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
    errorChart = new google.visualization.LineChart(document.getElementById('chart_error'));
    meanErrorChart = new google.visualization.LineChart(document.getElementById('chart_meanError'));

    speedData = new google.visualization.DataTable();
    errorData = new google.visualization.DataTable();
    meanErrorData = new google.visualization.DataTable();

    speedData.addColumn('date', 'Date');
    speedData.addColumn('number', 'Speed');
    speedData.addColumn('number', 'Predicted Speed');
    speedData.addColumn('number', 'EMA');


    errorData.addColumn('date', 'Date');
    errorData.addColumn('number', 'Error');

    meanErrorData.addColumn('date', 'Date');
    meanErrorData.addColumn('number', 'Mean Error');
    
    //getHttp('/sensors/query?data={"$from":"CounterMeasurement_0016_21_Resampled"}');
    getHttp('/sensors/query?data={"$from":"CounterMeasurement_0016_21_Resampled","$offset":1000,"$limit":300,"$sort":{"DateTime":-1}}');
    //getHttp('/sensors/query?data={"$from":"CounterMeasurement_0016_21_Resampled","$limit":100}');
    //getHttp('/sensors/query?data={"$from":"CounterMeasurement_0016_21_Resampled"}');
    //getHttp('/sensors/query?data={"$from":"CounterMeasurement_0016_21_Cleaned2"}');
    //getHttp('/sensors/query?data={"$from":"CounterMeasurement_0016_21"}', speedData, speedChart);
    //getHttp('/sensors/query?data={"$from":"CounterMeasurement_0016_21_Cleaned"}', speedDataCleaned, speedChartCleaned);
    //getHttp('/sensors/query?data={"$from":"CounterMeasurement_0016_21_Cleaned2"}', speedDataResampled, speedChartResampled);

}

google.load('visualization', '1.0', { 'packages': ['corechart'] });
google.setOnLoadCallback(initialize);