Chart.register(ChartDataLabels);

// Function to parse timestamp in format "2025-04-16 19:23:00 UTC" into valid JavaScript Date
function parseTimestamp(timestamp) {
    const isoString = timestamp.replace(" UTC", "Z");
    return new Date(isoString);
}

// Convert UTC timestamp string to client local time string
function convertToLocalTime(timestamp) {
    const date = parseTimestamp(timestamp);
    return date.toLocaleString('en-GB', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

function calculateAQI(pm25) {
    const breakpoints = [
        { c_low: 0.0,    c_high: 12.0,    i_low: 0,   i_high: 50,   label: "Good", emoji: "😀" },
        { c_low: 12.1,   c_high: 35.4,    i_low: 51,  i_high: 100,  label: "Moderate", emoji: "🙂" },
        { c_low: 35.5,   c_high: 55.4,    i_low: 101, i_high: 150,  label: "Unhealthy for Sensitive Groups", emoji: "😐" },
        { c_low: 55.5,   c_high: 150.4,   i_low: 151, i_high: 200,  label: "Unhealthy", emoji: "😷" },
        { c_low: 150.5,  c_high: 250.4,   i_low: 201, i_high: 300,  label: "Very Unhealthy", emoji: "🤢" },
        { c_low: 250.5,  c_high: 500.4,   i_low: 301, i_high: 500,  label: "Hazardous", emoji: "☠️" },
    ];

    for (const bp of breakpoints) {
        if (pm25 >= bp.c_low && pm25 <= bp.c_high) {
            const aqi = ((bp.i_high - bp.i_low) / (bp.c_high - bp.c_low)) * (pm25 - bp.c_low) + bp.i_low;
            return { aqi: Math.round(aqi), label: bp.label, emoji: bp.emoji };
        }
    }

    // If higher than highest breakpoint
    return { aqi: 500, label: "Hazardous", emoji: "☠️" };
}

document.addEventListener("DOMContentLoaded", async function () {
    const labels = [];
    const pm25Values = [];
    const pm10Values = [];
    const maxPoints = 10;

    await fetch('public/data/history24h.json')
        .then(response => response.json())
        .then(data => {
            data.forEach(entry => {
                const localTime = convertToLocalTime(entry.timestamp);
                labels.push(localTime);
                pm25Values.push(entry.pm25);
                pm10Values.push(entry.pm10);
            });
            if (labels.length > maxPoints) {
                labels.splice(0, labels.length - maxPoints);
                pm25Values.splice(0, pm25Values.length - maxPoints);
                pm10Values.splice(0, pm10Values.length - maxPoints);
            }

            const latestPm25 = pm25Values[pm25Values.length - 1];
            const { aqi, label, emoji } = calculateAQI(latestPm25);
            const aqiDisplay = document.getElementById('aqiDisplay');
            aqiDisplay.textContent = `${emoji} AQI: ${aqi} — ${label} (PM2.5: ${latestPm25.toFixed(1)} µg/m³)`;
            aqiDisplay.className = 'text-xl font-semibold text-center mb-6 p-3 rounded-lg shadow';

            switch (label) {
                case 'Good':
                    break;
                case 'Moderate':
                    break;
                case 'Unhealthy for Sensitive Groups':
                    break;
                case 'Unhealthy':
                    break;
                case 'Very Unhealthy':
                    break;
                case 'Hazardous':
                    break;
            }

            renderChart(labels, pm25Values, pm10Values);
        })
        .catch(error => console.error('Error loading JSON:', error));
})

// Function to render Chart.js graph
function renderChart(labels, pm25Values, pm10Values) {
    const ctx = document.getElementById('pmChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'PM 2.5',
                    data: pm25Values,
                    borderColor: '#f87171',
                    backgroundColor: 'rgba(248,113,113,0.1)',
                    tension: 0.3
                },
                {
                    label: 'PM 10',
                    data: pm10Values,
                    borderColor: '#60a5fa',
                    backgroundColor: 'rgba(96,165,250,0.1)',
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { title: { display: true, text: 'Time' }},
                y: { title: { display: true, text: 'Concentration (µg/m³)' }}
            },
            height: 500,
            plugins: {
                datalabels: {
                    anchor: 'end',
                    align: 'top',
                    color: '#FFF', // dark text color
                    font: {
                        weight: 'bold'
                    },
                    formatter: function(value) {
                        return value;  // show the value directly
                    }
                },
                zoom: {
                    pan: {
                        enabled: true,
                        mode: 'x'
                    },
                    zoom: {
                        wheel: {
                            enabled: true
                        },
                        pinch: {
                            enabled: true
                        },
                        mode: 'x'
                    }
                }
            }
        },
        plugins: [ChartDataLabels]
    });
}