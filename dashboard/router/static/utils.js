function correctTimestamp(timestamp) {
    return (timestamp + timestampDelta)*1000;
}

function getBackgroundColor(value) {
    let valueInRange = value;
    let startColor, endColor;
    let relativeValue;

    if (valueInRange <= 33) {
        startColor = { r: 208, g: 0, b: 0 };
        endColor = { r: 255, g: 188, b: 163 };
        relativeValue = valueInRange / 33; // Relative value within the range 0-33
    } else if (valueInRange > 33 && valueInRange <= 66) {
        startColor = { r: 255, g: 188, b: 163 };
        endColor = { r: 63, g: 182, b: 255 };
        relativeValue = (valueInRange - 33) / 33; // Relative value within the range 34-66
    } else if (valueInRange > 66 && valueInRange <= 100) {
        startColor = { r: 63, g: 182, b: 255 };
        endColor = { r: 30, g: 11, b: 126 };
        relativeValue = (valueInRange - 66) / 34; // Relative value within the range 67-100
    }

    const r = startColor.r + (endColor.r - startColor.r) * relativeValue;
    const g = startColor.g + (endColor.g - startColor.g) * relativeValue;
    const b = startColor.b + (endColor.b - startColor.b) * relativeValue;

    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}


function putMoistureValueInRange(value) {
    return Math.max(Math.min(Math.round(((value - minMoisture)/(maxMoisture - minMoisture)) * 100), 100), 0);
}

function updateSliderValue(value) {
    lastSliderValue = value;
    var deNormValue = (value / 100) * (maxMoisture - minMoisture) + minMoisture;
    fetch('/irrigation/slider?value=' + deNormValue, { method: 'POST' });
    //updateOptimalIrrigationLine(value);
}

async function updateControlMatrixValues(matrix, shouldUpdateChart = true) {
    let copy = []
    matrix.forEach(element => {
        copy.push({
            'x': element.x,
            'y': element.y,
            'v': (element.v / 100) * (maxMoisture - minMoisture) + minMoisture
        })
    });
    fetch('/irrigation/matrix', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
    body: JSON.stringify({ matrix: copy })
    })
    .then(response => response.json())
    .then(data => {
        if(shouldUpdateChart) {
            //updateOptimalIrrigationLine(data);
        }
    });
}
