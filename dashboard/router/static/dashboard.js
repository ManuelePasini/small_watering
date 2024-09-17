let minMoisture = parseInt(window.config.moistureScaleMin, 10);
let maxMoisture = parseInt(window.config.moistureScaleMax, 10);
let timestampDelta = (Date.now()/1000) - parseInt(window.config.timestamp, 10);
let lastSliderValue = 0;
Chart.defaults.font.size = 16;

$(document).ready(async function () {
    $('#persistency').prop('checked', window.config.uploadStatus == "True");

    $('#persistency').on('change', function () {
        if ($(this).is(':checked')) {
            fetch('/start_upload', { method: 'POST' });
        } else {
            fetch('/stop_upload', { method: 'POST' });
        }
    });

    $('#settingsButton').click(function () {
        $('#moistureRangeSelectionModal').modal('show');
    });

    $('#blinkingCircle').addClass('blinking-element-off');

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
        if (currentOptimal.id == "Matrix") {
            updateControlMatrixValues(currentOptimal.value.data, false);
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
    
    await fetch('/irrigation/optimal/', { method: 'GET' })
    .then(response => response.json())
    .then(data => {
        let row;
        let count = 0;

        for (const [key, value] of Object.entries(data)) {
            optimals.push(new Optimals(key, value.title, value.description, '/irrigation/optimal/image/' + key, value.value));

            if (count % 3 === 0) {
                row = $('<div class="row my-3"></div>');
                $('#optimalsContainer').append(row);
            }

            row.append(`
            <div class="col rounded" id="${key}Container">
                ${optimals[optimals.length - 1].toHtml()}
            </div>
        `);
            count++;
        }

        $('.card').click(function (e) {
            target = e.currentTarget;
            actualId = target.id.replace('Card', '');
            selectedOptimal = optimals.find(optimal => optimal.id == actualId);
            if (pumpMode == PumpMode.Auto){

                if (target.id.startsWith('slider')) {
                    fetch('/irrigation/mode?mode=slider', { method: 'POST' })
                    fetch('/irrigation/slider?value=' + getLastOptimalMoistureValue(), { method: 'POST' });
                } else {
                    fetch('/irrigation/mode?mode=matrix', { method: 'POST' });
                    updateControlMatrixValues(selectedOptimal.value.data, true);
                }
            } else {
                if (!target.id.startsWith('slider')) {
                    updateControlMatrixValues(selectedOptimal.value.data, true);
                }
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

    //optimals.push(new Optimals(get_optimal_from_name("Slider"), 'disabled', 'Disabled', null, null));
    fetch('/irrigation/mode?mode=manual', { method: 'POST' })
    let selectedOptimal = get_optimal_from_name("Slider");
    console.log(selectedOptimal)
    upsertIrrigationControls(selectedOptimal);

    async function fetchData() {
        try {
            const response = await fetch('/sensors/');
            const data = await response.json();
            data.timestamp = correctTimestamp(data.timestamp);
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
            data.timestamp = correctTimestamp(data.timestamp);
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
            data.forEach(entry => entry.timestamp = correctTimestamp(entry.timestamp));
            setupIrrigationLineChart(data);
            $('#syncingModal').modal('hide');
        } catch (error) {
            $('#syncingModal').modal('show');
        }
    }

    async function fetchPumpState() {
        try {
            const response = await fetch('/pump/state');
            const data = await response.json();
            $('#pumpStatus').text(data);
            if (data == 'On') {
                $('#blinkingCircle').removeClass('blinking-element-off');
                $('#blinkingCircle').addClass('blinking-element-on');
            } else {
                $('#blinkingCircle').removeClass('blinking-element-on');
                $('#blinkingCircle').addClass('blinking-element-off');
            }
        } catch (error) {
            $('#syncingModal').modal('show');
        }
    }

    $('#togglePump').click(function () {
        fetch('/pump/', { method: 'POST' }).then(response => response.json()).then(data => {
            $('#pumpStatus').text(data.pump_state);
            if (data === "On") {
                $('#togglePump').prop('disabled', true);
                $('#togglePump').prop('text', "Disattiva pompa");    
                setTimeout(function() {
                    $('#togglePump').prop('disabled', false);
                    $('#togglePump').prop('text', "Attiva pompa");  
                }, 10000);
            }
        });
    });

    $('#toggleMode').click(function () {
        if (pumpMode == PumpMode.Manual) {
            pumpMode = PumpMode.Auto;
            $('#togglePump').prop('disabled', true);
            $('#chooseOptimal').prop('disabled', false);
            $('#pumpMode').text('Automatico');
            //selectedOptimal = get_optimal_from_name("Slider");
            //upsertIrrigationControls(selectedOptimal);
            if(selectedOptimal.name == 'Slider'){
                fetch('/irrigation/mode?mode=slider', { method: 'POST' })
                fetch('/irrigation/slider?value=' + getLastOptimalMoistureValue(), { method: 'POST' });
            }else{
                fetch('/irrigation/mode?mode=matrix', { method: 'POST' })
            }
            
            
        } else if (pumpMode == PumpMode.Auto) {
            pumpMode = PumpMode.Manual;
            $('#togglePump').prop('disabled', false);
            $('#chooseOptimal').prop('disabled', false);
            $('#pumpMode').text('Manuale');
            //selectedOptimal = get_optimal_from_name("Slider");
            //upsertIrrigationControls(selectedOptimal);
            fetch('/irrigation/mode?mode=manual', { method: 'POST' })
        }
    });

    $('#chooseOptimal').click(function () {
        $('#optimalSelectionModal').modal('show');
    });
    
    fetchData();
    fetchInterpolatedData();
    fetchAllIrrigationData();
    setInterval(fetchInterpolatedData, 500);
    setInterval(fetchPumpState, 1000);

    $('#chooseOptimal').prop('disabled', true);
});
