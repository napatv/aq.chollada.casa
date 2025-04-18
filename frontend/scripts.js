// Function to parse timestamp in format "2025-04-16 19:23:00 UTC" into valid JavaScript Date
function parseTimestamp(timestamp) {
    // Replace the UTC part and convert to ISO format
    const isoString = timestamp.replace(" UTC", "Z");
    return new Date(isoString);
}

document.addEventListener("DOMContentLoaded", function () {
    const loadingMessage = document.getElementById("loading-message");
    const errorMessage = document.getElementById("error-message");
    const historyTable = document.getElementById("history-table").getElementsByTagName('tbody')[0];
    
    const storageUrl = "https://aq.chollada.casa/public/data/history24h.json";  // Replace with your public Cloud Storage URL
    
    fetch(storageUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error("Failed to fetch data.");
            }
            return response.json();
        })
        .then(data => {
            loadingMessage.style.display = "none";  // Hide loading message
            errorMessage.style.display = "none";  // Hide error message
            data.forEach(record => {
                const row = historyTable.insertRow();
                const timestampCell = row.insertCell(0);
                const pm25Cell = row.insertCell(1);
                const pm10Cell = row.insertCell(2);

                // Manually parse the Timestamp if it is in the format "2025-04-16 19:23:00 UTC"
                const timestamp = parseTimestamp(record.Timestamp);
                const formattedDate = timestamp ? timestamp.toLocaleString() : "Invalid Date";

                timestampCell.textContent = formattedDate;
                pm25Cell.textContent = record.PM25;
                pm10Cell.textContent = record.PM10;
            });
        })
        .catch(error => {
            loadingMessage.style.display = "none";  // Hide loading message
            errorMessage.style.display = "block";   // Show error message
            console.error("Error loading air quality data:", error);
        });
});
