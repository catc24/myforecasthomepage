function generateForecast() {
    const timeOfDay = document.getElementById('timeOfDay').value;
    const weatherCondition = document.getElementById('weatherCondition').value;
    const precipitation = document.getElementById('precipitation').value;
    const windSpeed = document.getElementById('windSpeed').value;
    const windDirection = document.getElementById('windDirection').value;
    const gusts = document.getElementById('gusts').checked;

    let forecast = `${capitalizeFirstLetter(weatherCondition)} in the ${timeOfDay}`;

    if (precipitation !== 'none') {
        forecast += ` with ${precipitation}`;
    }

    if (windSpeed > 0) {
        forecast += ` and ${windSpeed} mph ${windDirection} winds`;
    } else {
        forecast += ` and calm winds`;
    }

    if (gusts) {
        forecast += ` with gusts`;
    }

    forecast += '.';

    document.getElementById('forecast').innerText = forecast;
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
