let irrigationLineChart;
let lastIrrigationData;

function convertTimestampToDate(timestamp) {
    return luxon.DateTime.fromSeconds(timestamp).toJSDate();
}

function normalizeIrrigationValue(value, maxIrrigationValue) {
    return (value / maxIrrigationValue) * 100;
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
                        x: convertTimestampToDate(entry.timestamp),
                        y: entry.optimal_m
                    })),
                    label: 'Optimal',
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
                        x: convertTimestampToDate(entry.timestamp),
                        y: entry.current_m
                    })),
                    label: 'Current',
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
                    label: 'Water output',
                    data: historyData.map(entry => ({
                        x: convertTimestampToDate(entry.timestamp),
                        y: normalizeIrrigationValue(entry.irrigation, maxIrrigationValue),
                        rawValue: entry.irrigation // Store the raw irrigation value
                    })),
                    backgroundColor: 'rgba(0, 0, 128, 0.2)',
                    datalabels: {
                        display: true,
                        align: 'start',
                        anchor: 'end',
                        formatter: function (value) {
                            if (value.rawValue == null) {
                                return '';
                            }
                            return value.rawValue.toFixed(1);
                        },
                        color: 'black',
                        offset: -5
                    }
                },
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                datalabels: {
                    display: false // Disable datalabels globally
                }
            },
            scales: {
                x: {
                    type: 'realtime',
                    realtime: {
                        duration: 120000,
                        refresh: 15000,
                        delay: 1000,
                        pause: false,
                        frameRate: 30,
                        onRefresh: function (chart) {
                            const newTimestamp = convertTimestampToDate(lastIrrigationData.timestamp);
                            const dataset = irrigationLineChart.data.datasets;

                            if (dataset[2].data.x == newTimestamp) {
                                return;
                            }

                            if (dataset[2].data.length === 0 || dataset[2].data[dataset[2].data.length - 1].x < newTimestamp) {
                                dataset[2].data.push({
                                    x: newTimestamp,
                                    y: normalizeIrrigationValue(lastIrrigationData.irrigation, 15),
                                    rawValue: lastIrrigationData.irrigation
                                });
                                dataset[0].data.push({ x: newTimestamp, y: lastIrrigationData.optimal_m });
                                dataset[1].data.push({ x: newTimestamp, y: lastIrrigationData.current_m });
                                irrigationLineChart.update();
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: 'Time (seconds)'
                    }
                },
                y: {
                    beginAtZero: true,
                    min: 0,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Humidity level'
                    }
                }
            },
            animation: false
        },
        plugins: [ChartDataLabels] // Register the plugin
    });
}

// async function updateIrrigationLineChart(newData, maxIrrigationValue = 15) {
//     const newTimestamp = convertTimestampToDate(newData.timestamp);
//     const dataset = irrigationLineChart.data.datasets;
//     if (dataset[0].data.length === 0 || dataset[0].data[dataset[0].data.length - 1].x < newTimestamp) {
//         dataset[0].data.push({
//             x: newTimestamp,
//             y: normalizeIrrigationValue(newData.irrigation, maxIrrigationValue),
//             rawValue: newData.irrigation // Store the raw irrigation value
//         });
//         dataset[1].data.push({ x: newTimestamp, y: newData.optimal_m });
//         dataset[2].data.push({ x: newTimestamp, y: newData.current_m });
//         irrigationLineChart.update();
//     }
// }

function updateIrrigationLineChart(newData) {
    lastIrrigationData = newData;
}

window.setupIrrigationLineChart = setupIrrigationLineChart;
window.updateIrrigationLineChart = updateIrrigationLineChart;