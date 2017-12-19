const {ipcRenderer} = require('electron')
const {remote} = require('electron');

window.onload = function () {
    ipcRenderer.send('get-analysis-data');
};

ipcRenderer.on('put-analysis-data', function(event, info) {
    putData(info);
});

function htmlEscape(text){  
    return text.replace(/[ <>"&]/g, function(match, pos, orginalText){  
        switch(match){  
            case " ":
                return "&nbsp";
            case "<":  
                return "&lt";  
            case ">":  
                return "&gt";  
            case "&":  
                return "&amp";  
            case "\"":  
                return "&quot";  
        }  
    })  
}  

function intValue(str) {
    console.log("intValue, str=" + str + ", type=" + (typeof str));
    if (str == undefined) return 0;
    return parseFloat(str.toString().split(/,/).join(""));
}

function putData(info) {
    let src_analysis = document.getElementById('src-analysis');
    let func_miss = document.getElementById('function-miss');
    let cache_info = document.getElementById('cache-info')
    let ret = `<tr>
    <th>Ir</th><th>I1mr</th><th>ILmr</th>
    <th>Dr</th><th>D1mr</th><th>DLmr</th>
    <th>Dw</th><th>D1mw</th><th>DLmw</th> <th>source</th>
    </tr>`;
    for (let i = 1; i < info.linesInfo.length; i++) {
        let item = info.linesInfo[i];
        ret += `<tr><td>${item.Ir}</td><td>${item.I1mr}</td><td>${item.ILmr}</td>
        <td>${item.Dr}</td><td>${item.D1mr}</td><td>${item.DLmr}</td>
        <td>${item.Dw}</td><td>${item.D1mw}</td><td>${item.DLmw}</td>
        <td><code>${htmlEscape(item.context)}</code></td></tr>`;
    }
    src_analysis.innerHTML = ret;

    let tot_miss = intValue(info.D1mr) + intValue(info.DLmr) + intValue(info.D1mw) + intValue(info.DLmw);
    console.log("tot_miss=" + tot_miss);
    ret = `<tr>
    <th style="width: 10px">#</th>
    <th>Function</th>
    <th style="width: 40%">Ratio</th>
    <th style="width: 40px">Miss Count</th></tr>`;
    let color = ['danger', 'primary', 'success', 'yellow', 'green'];
    for (let i = 0; i < info.functionInfo.length; i++) {
        let item = info.functionInfo[i];
        if (item.functionName == undefined || item.functionName == "???:???") continue;
        let count = intValue(item.D1mr) + intValue(item.DLmr) + intValue(item.D1mw) + intValue(item.DLmw);
        console.log('count=' + count);
        ret += `<tr>
        <td>${i+1}</td>
        <td>${item.functionName}</td>
        <td>
          <div class="progress progress-xs">
            <div class="progress-bar progress-bar-${color[i % 5]}" style="width: ${count / tot_miss * 100}%"></div>
          </div>
        </td>
        <td><span class="badge bg-red">${count}</span></td>
        </tr>`;
    }
    func_miss.innerHTML = ret;

    ret=`<div class="col-md-6">
            <div class="small-box bg-aqua">
                <div class="inner">
                    <h3>I1 Cache</h3>
                    <p>${info.I1Cache.split(",")[0]}</p>
                    <p><small>${info.I1Cache.split(",").slice(1).join("&nbsp")}</small></p>
                </div>
                <div class="icon">
                    <i class="ion ion-funnel"></i>
                </div>
                <a href="#" class="small-box-footer">More info <i class="fa fa-arrow-circle-right"></i></a>
            </div>
        </div>`;
    ret+=`<div class="col-md-6">
        <div class="small-box bg-green">
            <div class="inner">
                <h3>D1 Cache</h3>
                <p>${info.D1Cache.split(",")[0]}</p>
                <p><small>${info.D1Cache.split(",").slice(1).join("&nbsp")}</small></p>
            </div>
            <div class="icon">
                <i class="ion ion-funnel"></i>
            </div>
            <a href="#" class="small-box-footer">More info <i class="fa fa-arrow-circle-right"></i></a>
        </div>
    </div>`;
    ret+=`<div class="col-md-12">
        <div class="small-box bg-yellow">
            <div class="inner">
                <h3>LL Cache</h3>
                <p>${info.LLCache.split(",")[0]}</p>
                <p><small>${info.LLCache.split(",").slice(1).join("&nbsp")}</small></p>
            </div>
            <div class="icon">
                <i class="ion ion-aperture"></i>
            </div>
            <a href="#" class="small-box-footer">More info <i class="fa fa-arrow-circle-right"></i></a>
        </div>
    </div>`;
    cache_info.innerHTML = ret;

    let chartColors = {
        red: 'rgb(255, 99, 132)',
        orange: 'rgb(255, 159, 64)',
        yellow: 'rgb(255, 205, 86)',
        green: 'rgb(75, 192, 192)',
        blue: 'rgb(54, 162, 235)',
        purple: 'rgb(153, 102, 255)',
        grey: 'rgb(201, 203, 207)'
    }

    var mycolor = Chart.helpers.color;
    var areaChartData = {
        labels: ["ICache Read", "DCache Read", "DCache Write"],
        datasets: [
          {
            label: "Ref Count",
            backgroundColor: mycolor(chartColors.blue).alpha(0.5).rgbString(),
            borderColor: chartColors.blue,
            borderWidth: 1,
            // fillColor: "rgba(210, 214, 222, 1)",
            // strokeColor: "rgba(210, 214, 222, 1)",
            // pointColor: "rgba(210, 214, 222, 1)",
            // pointStrokeColor: "#c1c7d1",
            // pointHighlightFill: "#fff",
            // pointHighlightStroke: "rgba(220,220,220,1)",
            data: [intValue(info.Ir), intValue(info.Dr), intValue(info.Dw)]
          },
          {
            label: "1st Level Cache",
            backgroundColor: mycolor(chartColors.red).alpha(0.5).rgbString(),
            borderColor: chartColors.red,
            borderWidth: 1,
            // fillColor: "rgba(60,141,188,0.9)",
            // strokeColor: "rgba(60,141,188,0.8)",
            // pointColor: "#3b8bba",
            // pointStrokeColor: "rgba(60,141,188,1)",
            // pointHighlightFill: "#fff",
            // pointHighlightStroke: "rgba(60,141,188,1)",
            data: [intValue(info.I1mr), intValue(info.D1mr), intValue(info.D1mw)]
          },
          {
            label: "last Level Cache",
            backgroundColor: mycolor(chartColors.purple).alpha(0.5).rgbString(),
            borderColor: chartColors.purple,
            borderWidth: 1,
            // fillColor: "rgba(60,141,188,0.9)",
            // strokeColor: "rgba(60,141,188,0.8)",
            // pointColor: "#3b8bba",
            // pointStrokeColor: "rgba(60,141,188,1)",
            // pointHighlightFill: "#fff",
            // pointHighlightStroke: "rgba(60,141,188,1)",
            data: [intValue(info.ILmr), intValue(info.DLmr), intValue(info.DLmw)]
          }
        ]
    };

    var barChartCanvas = document.getElementById("barChart").getContext("2d");
    var barChartData = areaChartData;
    barChartData.datasets[2].fillColor = "#00a65a";
    barChartData.datasets[2].strokeColor = "#00a65a";
    barChartData.datasets[2].pointColor = "#00a65a";
    var barChartOptions = {
      //Boolean - Whether the scale should start at zero, or an order of magnitude down from the lowest value
      scaleBeginAtZero: true,
      //Boolean - Whether grid lines are shown across the chart
      scaleShowGridLines: true,
      //String - Colour of the grid lines
      scaleGridLineColor: "rgba(0,0,0,.05)",
      //Number - Width of the grid lines
      scaleGridLineWidth: 1,
      //Boolean - Whether to show horizontal lines (except X axis)
      scaleShowHorizontalLines: true,
      //Boolean - Whether to show vertical lines (except Y axis)
      scaleShowVerticalLines: true,
      //Boolean - If there is a stroke on each bar
      barShowStroke: true,
      //Number - Pixel width of the bar stroke
      barStrokeWidth: 2,
      //Number - Spacing between each of the X value sets
      barValueSpacing: 5,
      //Number - Spacing between data sets within X values
      barDatasetSpacing: 1,
      //String - A legend template
      legendTemplate: "<ul class=\"<%=name.toLowerCase()%>-legend\"><% for (var i=0; i<datasets.length; i++){%><li><span style=\"background-color:<%=datasets[i].fillColor%>\"></span><%if(datasets[i].label){%><%=datasets[i].label%><%}%></li><%}%></ul>",
      //Boolean - whether to make the chart responsive
      responsive: true,
      maintainAspectRatio: true,

      scales: {
        yAxes: [{
            type: 'logarithmic',
        }]
      }
    };

    barChartOptions.datasetFill = false;
    var barChart = new Chart(barChartCanvas, {
        type: "bar",
        data: barChartData,
        options: {
            responsive: true,
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: 'Ref & Miss over D/I Cache'
            },
            scales: {
                yAxes: [{
                    type: 'logarithmic',
                }]
            }
        }
    });
    //barChart.Bar(barChartData, barChartOptions);
}

