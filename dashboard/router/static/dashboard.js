let minMoisture = 0;
let maxMoisture = 100;
let lastSliderValue = 0;
Chart.defaults.font.size = 16;

$(document).ready(function () {

    $('#settingsButton').click(function () {
        $('#moistureRangeSelectionModal').modal('show');
    });

    $('#minMoisture').val(minMoisture);
    $('#maxMoisture').val(maxMoisture);

    $('#minMoisture').on('input', function () {
        $('#maxMoisture').attr('min', minMoisture + 1);
    });

    $('#maxMoisture').on('input', function () {
        $('#minMoisture').attr('max', maxMoisture - 1);
    });

    $('#moistureRangeSelectionModalConfirm').click(function () {
        minMoisture = Number($('#minMoisture').val());
        maxMoisture = Number($('#maxMoisture').val());
        setRealtimeLineChartMoinstureRange();
        setMatrixChartMoinstureRange();
        setIrrigationLineChartMoinstureRange();
        if (currentOptimal.id == get_optimal_from_name("Slider").id) {
            updateSliderValue(lastSliderValue);
        } else if (currentOptimal.id != get_optimal_from_name("disabled").id) {
            updateMatrixValues(currentOptimal.value.data);
        }
        $('#moistureRangeSelectionModal').modal('hide');
    });

    class PumpMode {
        static Manual = new PumpMode('Manual');
        static Auto = new PumpMode('Auto');

        constructor(name) {
            this.name = name;
        }
        toString() {
            return `PumpMode.${this.name}`;
        }
    }

    let pumpMode = PumpMode.Manual;
    optimals.push(new Optimals('disabled', 'disabled', 'Disabled', null, null));
    let selectedOptimal = optimals[0];
    fetch('/irrigation/mode?mode=manual', { method: 'POST' })
    upsertIrrigationControls(selectedOptimal);

    async function fetchData() {
        try {
            const response = await fetch('/sensors/');
            const data = await response.json();
            setupRealtimeLineChart(data);
            $('#syncingModal').modal('hide');
        } catch (error) {
            $('#syncingModal').modal('show');
        }
    }

    async function fetchInterpolatedData() {
        try {
            const response = await fetch('/sensors/interpolated');
            const data = await response.json();
            updateMatrixChart(data);
            $('#syncingModal').modal('hide');
        } catch (error) {
            $('#syncingModal').modal('show');
        }
    }

    async function fetchAllIrrigationData() {
        try {
            const response = await fetch('/irrigation/history?seconds=600');
            const data = await response.json();
            setupIrrigationLineChart(data);
            $('#syncingModal').modal('hide');
        } catch (error) {
            $('#syncingModal').modal('show');
        }
    }

    $('#togglePump').click(function () {
        fetch('/pump/', { method: 'POST' });
    });

    $('#toggleMode').click(function () {
        if (pumpMode == PumpMode.Manual) {
            pumpMode = PumpMode.Auto;
            $('#togglePump').prop('disabled', true);
            $('#chooseOptimal').prop('disabled', false);
            $('#pumpMode').text('Automatico');
            selectedOptimal = get_optimal_from_name("Slider");
            upsertIrrigationControls(selectedOptimal);
            fetch('/irrigation/mode?mode=slider', { method: 'POST' })
            fetch('/irrigation/slider?value=' + getLastOptimalMoistureValue(), { method: 'POST' });
        } else if (pumpMode == PumpMode.Auto) {
            pumpMode = PumpMode.Manual;
            $('#togglePump').prop('disabled', false);
            $('#chooseOptimal').prop('disabled', true);
            $('#pumpMode').text('Manuale');
            selectedOptimal = get_optimal_from_name("disabled");
            upsertIrrigationControls(selectedOptimal);
            fetch('/irrigation/mode?mode=manual', { method: 'POST' })
        }
    });

    $('#chooseOptimal').click(function () {
        $('#optimalSelectionModal').modal('show');
    });

    fetch('/irrigation/optimal/', { method: 'GET' })
        .then(response => response.json())
        .then(data => {
            let row;
            let count = 0;

            for (const [key, value] of Object.entries(data)) {
                optimals.push(new Optimals(key, value.title, value.description, '/irrigation/optimal/image/' + key, value.value));

                if (count % 5 === 0) {
                    row = $('<div class="row"></div>');
                    $('#optimalsContainer').append(row);
                }

                row.append(`
                <div class="col" id="${key}Container">
                    ${optimals[optimals.length - 1].toHtml()}
                </div>
            `);
                count++;
            }

            $('.card').click(function (e) {
                target = e.currentTarget;
                actualId = target.id.replace('Card', '');
                selectedOptimal = optimals.find(optimal => optimal.id == actualId);
                if (target.id.startsWith('slider')) {
                    fetch('/irrigation/mode?mode=slider', { method: 'POST' })
                    fetch('/irrigation/slider?value=' + getLastOptimalMoistureValue(), { method: 'POST' });
                } else {
                    fetch('/irrigation/mode?mode=matrix', { method: 'POST' });
                    updateMatrixValues(selectedOptimal.value.data);
                }

                optimals.forEach(o => $('#' + o.name + 'Card').removeClass('border-primary').removeClass('border-secondary'));
                $('#' + selectedOptimal.name + 'Card').addClass('border-primary');

                upsertIrrigationControls(selectedOptimal);

                $('#optimalSelectionModal').modal('hide');
            })

            $('.card').hover(function (e) {
                target = $("#" + e.currentTarget.id);
                if (!target.hasClass('border-primary')) {
                    target.addClass('border-secondary');
                }
            })

            $('.card').on('mouseleave', function (e) {
                target = $("#" + e.currentTarget.id);
                if (target.hasClass('border-secondary')) {
                    target.removeClass('border-secondary');
                }
            })
        });

    const socket = io(window.config.serverIp);

    socket.on('pump_state_update', (data) => {
        $('#pumpStatus').text(data.pump_state);
    });

    fetchData();
    fetchInterpolatedData();
    fetchAllIrrigationData();
    setInterval(fetchInterpolatedData, 500);

    $('#chooseOptimal').prop('disabled', true);
});