let irrigationLineChart;
let lastIrrigationData;
let didUsePreview = false;
let overall_error = 0;
window.error_counter = 0

function normalizeIrrigationValue(value, maxIrrigationValue) {
    return ((value) / maxIrrigationValue) * 100;
}
function sumArray(array) {
    return array.reduce(function(accumulator, currentValue) {
        return accumulator + currentValue;
    }, 0); // 0 è il valore iniziale per l'accumulatore
}

function setupIrrigationLineChart(historyData, maxIrrigationValue = 15) {
    let lineCtx = $('#irrigationLineChart')[0].getContext('2d');
    lastIrrigationData = historyData[historyData.length - 1];
    irrigationLineChart = new Chart(lineCtx, {
        type: 'line',
        data: {
            datasets: [
                {
                    data: historyData.map(entry => ({
                        x: entry.timestamp,
                        y: putMoistureValueInRange(entry.optimal_m)
                    })),
                    label: 'Umidità ottimale',
                    borderWidth: 3,
                    borderColor: 'blue',
                    fill: false,
                    pointStyle: 'line',
                    pointRadius: 0,
                    tension: 0.4,
                    cubicInterpolationMode: 'monotone'
                },
                {
                    data: historyData.map(entry => ({
                        x: entry.timestamp,
                        y: putMoistureValueInRange(entry.current_m)
                    })),
                    label: 'Umidità attuale',
                    borderWidth: 3,
                    borderColor: 'cyan',
                    fill: false,
                    pointStyle: 'line',
                    pointRadius: 0,
                    tension: 0.4,
                    cubicInterpolationMode: 'monotone'
                },
                {
                    type: 'bar',
                    label: 'Consiglio irriguo',
                    data: historyData.filter(elem => elem.irrigation > 0).map(entry => ({
                        x: entry.timestamp,
                        y: normalizeIrrigationValue(entry.irrigation, maxIrrigationValue),
                        rawValue: 0.03 * entry.irrigation
                    })),
                    backgroundColor: 'rgba(0, 0, 128, 0.2)',
                    datalabels: {
                        display: true,
                        align: function (context) {
                            const value = context.dataset.data[context.dataIndex].rawValue;
                            return value == 0 ? 'top' : 'start';
                        },
                        anchor: 'end',
                        clamp: true,
                        formatter: function (value) {
                            return (value == null || value === "") ? '' : value.rawValue.toFixed(2);
                        },
                        color: 'black',
                        offset: 0
                    }
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                datalabels: { display: false},
                tooltip: { enabled: false}
            },
            scales: {
                x: {
                    type: 'realtime',
                    realtime: {
                        duration: 120000,
                        refresh: 1000,
                        delay: 1700,
                        pause: false,
                        frameRate: 30,
                        onRefresh: async function (chart) {
                            let IrrigationData;
                            try {
                                const response = await fetch('/irrigation/');
                                IrrigationData = await response.json();
                            } catch (error) {
                                $('#syncingModal').modal('show');
                            }

                             if (IrrigationData == null || lastIrrigationData.timestamp == IrrigationData.timestamp ) {
                                 return;
                             }


                            lastIrrigationData = IrrigationData;

                            lastIrrigationData.timestamp = correctTimestamp(lastIrrigationData.timestamp);

                            const dataset = irrigationLineChart.data.datasets;
                            
                            if (dataset[0].data.length != 0 && lastIrrigationData.timestamp == dataset[0].data[dataset[0].data.length - 1].x) {
                                return;
                            }
                            
                            const optimal_moisture = Math.round(putMoistureValueInRange(lastIrrigationData["optimal_m"]) * 100) / 100
                            const current_moisture = Math.round(putMoistureValueInRange(lastIrrigationData["current_m"]) * 100) / 100
                            
                            const r = Math.abs(current_moisture - optimal_moisture)
                            $("#optimalMoisture").text(optimal_moisture + "%")
                            $("#observedMoisture").text(current_moisture + "%")
                            overall_error = (overall_error * window.error_counter + r) / (window.error_counter + 1)
                            $("#rmse").text(overall_error.toFixed(0) + "%");

                            window.error_counter = window.error_counter + 1;
                            console.log(window.error_counter)
                            
                            if (dataset[2].data.length === 0 || dataset[2].data[dataset[2].data.length - 1].x < lastIrrigationData.timestamp) {
                                if (lastIrrigationData.irrigation !== null && lastIrrigationData.irrigation !== undefined) {
                                    dataset[2].data.push({
                                        x: lastIrrigationData.timestamp,
                                        y: normalizeIrrigationValue(lastIrrigationData.irrigation, 15),
                                        rawValue: 0.03 * lastIrrigationData.irrigation,
                                    });               
                                }

                                if (!didUsePreview) {
                                    dataset[0].data.push({ x: lastIrrigationData.timestamp, y: optimal_moisture });
                                }
                                didUsePreview = false;

                                dataset[1].data.push({ x: lastIrrigationData.timestamp, y: current_moisture });
                                irrigationLineChart.update();
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: 'Tempo (secondi)'
                    }
                },
                y: {
                    beginAtZero: true,
                    min: 0,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Livello di umidità'
                    }
                },
                y1: {
                    beginAtZero: true,
                    min: 0,
                    max: 0.45,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Consiglio irriguo (litri)'
                    },
                    grid: {
                        drawOnChartArea: false,
                    },
                },
            },
            animation: false
        },
        plugins: [ChartDataLabels]
    });
}

function updateOptimalIrrigationLine(value) {
    if (didUsePreview) {
        irrigationLineChart.data.datasets[0].data.pop();
    }
    const lastDrawnData = irrigationLineChart.data.datasets[0].data[irrigationLineChart.data.datasets[0].data.length - 1];
    irrigationLineChart.data.datasets[0].data.push({ x: lastDrawnData.x + 15000, y: (value) });
    didUsePreview = true;
    irrigationLineChart.update();
}

function getLastOptimalMoistureValue() {
    if (lastIrrigationData && lastIrrigationData.optimal_m){
        return lastIrrigationData.optimal_m;
    }else{
        return 45
    }
}

function resetError(){
    overall_error = 0
    window.error_counter = 0
}

function getNormalizedLastOptimalMoistureValue() {
    return putMoistureValueInRange(lastIrrigationData.optimal_m);
}


window.setupIrrigationLineChart = setupIrrigationLineChart;
window.getLastOptimalMoistureValue = getLastOptimalMoistureValue;
window.resetError = resetError
