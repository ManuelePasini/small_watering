let lastSensorData;
let skippedCounter = 0;
let lineChart
let datasets = {}

function createRealTimeDatasetConfig(x, y, color) {
    datasets[x + "_" + y] = {
        label: "Sensore (" + x + ", " + y + ")",
        data: [],
        borderWidth: 2,
        borderColor: color,
        fill: false,
        pointStyle: 'line',
        pointRadius: 0,
        tension: 0.4,
        cubicInterpolationMode: 'monotone'
    }
    return datasets[x + "_" + y]
}

function drawNewPoint(sensor_data, dataset, timestamp) {
    if (dataset.data.length > 2) {
        const lastDrawnData = dataset.data[dataset.data.length - 1];
        if (lastDrawnData.y != sensor_data.v || skippedCounter >= 1) {
            dataset.data.push({ x: timestamp, y: putMoistureValueInRange(sensor_data.v) });
        } else {
            skippedCounter++;
        }
    } else {
        dataset.data.push({ x: timestamp, y: putMoistureValueInRange(sensor_data.v) });
    }
}

function setupRealtimeLineChart() {
    let lineCtx = $('#lineChart')[0].getContext('2d');
    lineChart = new Chart(lineCtx, {
        type: 'line',
        data: {
            datasets: [
                createRealTimeDatasetConfig('10', '5', '#EB9400'),
                createRealTimeDatasetConfig('10', '15', '#8900EB'),
                createRealTimeDatasetConfig('10', '25', '#00EB62'),
                createRealTimeDatasetConfig('30', '5', '#F0E379'),
                createRealTimeDatasetConfig('30', '15', '#E00C00'),
                createRealTimeDatasetConfig('30', '25', '#64AAEB'),
            ]
        },
        options: {
            plugins: { tooltip: { enabled: false } },
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'realtime',
                    realtime: {
                        duration: 120000,
                        refresh: 1000,
                        delay: 0,
                        pause: false,
                        frameRate: 30,
                        onRefresh: async function (chart) {
                            let newSensorData = null
                            try {
                                const response = await fetch('/sensors/');
                                newSensorData = await response.json();
                                $('#syncingModal').modal('hide');
                            } catch (error) {
                                $('#syncingModal').modal('show');
                            }
                            if (newSensorData == undefined || newSensorData == null || newSensorData.timestamp == undefined) {
                                lastSensorData = null;
                                return;
                            }

                            if(lastSensorData != null && newSensorData.timestamp <= lastSensorData.timestamp) {
                                return;
                            }

                            lastSensorData = newSensorData;
                            drawNewPoint(newSensorData.data.find(elem => elem.x == 10 && elem.y == 5), datasets["10_5"], correctTimestamp(newSensorData.timestamp));
                            drawNewPoint(newSensorData.data.find(elem => elem.x == 10 && elem.y == 15), datasets["10_15"], correctTimestamp(newSensorData.timestamp));
                            drawNewPoint(newSensorData.data.find(elem => elem.x == 10 && elem.y == 25), datasets["10_25"], correctTimestamp(newSensorData.timestamp));
                            drawNewPoint(newSensorData.data.find(elem => elem.x == 30 && elem.y == 5), datasets["30_5"], correctTimestamp(newSensorData.timestamp));
                            drawNewPoint(newSensorData.data.find(elem => elem.x == 30 && elem.y == 15), datasets["30_15"], correctTimestamp(newSensorData.timestamp));
                            drawNewPoint(newSensorData.data.find(elem => elem.x == 30 && elem.y == 25), datasets["30_25"], correctTimestamp(newSensorData.timestamp));
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
                }
            },
            animation: false,
        }
    });
}

window.setupRealtimeLineChart = setupRealtimeLineChart;