document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM content loaded.");
  var socket = io.connect("http://" + document.domain + ":" + location.port);
  var audioContext;
  var analyser;
  var waveformCanvas;
  var waveformCtx;
  var spectrogramCanvas;
  var spectrogramCtx;
  var chromagramCanvas;
  var chromagramCtx;
  var spectralCanvas;
  var spectralCtx;
  var isPlaying = false;
  var mediaStreamSource;
  var dataArray;

  function startAudio() {
    if (isPlaying) return;

    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 8192;
    var bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);

    waveformCanvas = document.getElementById("waveformCanvas");
    waveformCtx = waveformCanvas.getContext("2d");

    chromagramCanvas = document.getElementById("chromagramCanvas");
    chromagramCtx = chromagramCanvas.getContext("2d");

    spectralCanvas = document.getElementById("spectralCanvas");
    spectralCtx = spectralCanvas.getContext("2d");

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(function(stream) {
        mediaStreamSource = audioContext.createMediaStreamSource(stream);
        mediaStreamSource.connect(analyser);

        isPlaying = true;
        drawWaveform();
        drawChromagram();
        drawSpectral();
      })
      .catch(function (error) {
        console.log('Error accessing microphone:', error);
      });
  }

  const startAudioButton = document.getElementById("startAudioButton");
  if (startAudioButton) {
    startAudioButton.addEventListener("click", startAudio);
  } else {
    console.log("Error: startAudioButton not found.");
  }

  function drawWaveform() {
  if (!isPlaying) return;

  requestAnimationFrame(drawWaveform);
  analyser.getByteTimeDomainData(dataArray);

  waveformCtx.clearRect(0, 0, waveformCanvas.width, waveformCanvas.height);
  waveformCtx.fillStyle = 'rgb(255, 255, 255)';
  waveformCtx.fillRect(0, 0, waveformCanvas.width, waveformCanvas.height);

  waveformCtx.lineWidth = 2;
  waveformCtx.strokeStyle = 'rgb(255, 0, 0)';
  waveformCtx.beginPath();

  var sliceWidth = waveformCanvas.width * 1.0 / dataArray.length;
  var x = 0;

  for (var i = 0; i < dataArray.length; i++) {
    var v = (dataArray[i] / 128.0) - 1;
    var y = (waveformCanvas.height / 2) - (v * waveformCanvas.height / 4);

    if (i === 0) {
      waveformCtx.moveTo(x, y);
    } else {
      waveformCtx.lineTo(x, y);
    }

    x += sliceWidth;
  }

  waveformCtx.lineTo(waveformCanvas.width, waveformCanvas.height / 2);
  waveformCtx.stroke();

  // Draw y-axis
  waveformCtx.beginPath();
  waveformCtx.moveTo(0, 0);
  waveformCtx.lineTo(0, waveformCanvas.height);
  waveformCtx.strokeStyle = 'rgb(150, 150, 150)';
  waveformCtx.stroke();

waveformCtx.fillStyle = 'rgb(0, 0, 0)';
waveformCtx.textAlign = 'right';

var labelSpacing = waveformCanvas.height / 5;
var startY = labelSpacing - labelSpacing / 5; 

waveformCtx.fillText('4', 10, startY);
waveformCtx.fillText('2', 10, startY + labelSpacing);
waveformCtx.fillText('0', 10, startY + 2 * labelSpacing);
waveformCtx.fillText('-2', 10, startY + 3 * labelSpacing);
waveformCtx.fillText('-4', 10, startY + 4 * labelSpacing);

    var amplitude = getAmplitude();
    var time = getTime();
    document.getElementById("waveformValues").innerHTML = `<b>Amplitude:</b> ${amplitude} dB <b>Time:</b> ${time} s`;
  }

function drawChromagram() {
  if (!isPlaying) return;

  requestAnimationFrame(drawChromagram);
  analyser.getByteFrequencyData(dataArray);

  chromagramCtx.clearRect(0, 0, chromagramCanvas.width, chromagramCanvas.height);
  chromagramCtx.fillStyle = 'rgb(0, 0, 0)';
  chromagramCtx.fillRect(0, 0, chromagramCanvas.width, chromagramCanvas.height);

  var numPitchClasses = 12;
  var binWidth = chromagramCanvas.width / numPitchClasses;
  var pitchClasses = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  var timeIndex = 0;
  for (var i = 0; i < numPitchClasses; i++) {
    var hue = i * (360 / numPitchClasses);
    var saturation = 100;

    var y = chromagramCanvas.height - (dataArray[timeIndex] / 5.55); 
    chromagramCtx.strokeStyle = 'hsl(' + hue + ', ' + saturation + '%, 50%)';
    chromagramCtx.beginPath();
    chromagramCtx.moveTo(i * binWidth, y);

    for (var j = 1; j < chromagramCanvas.width / binWidth; j++) {
      var dataIndex = timeIndex + j;
      var amplitude = dataArray[dataIndex % dataArray.length] / 5.55;
      var x = i * binWidth + j * binWidth;
      y = chromagramCanvas.height - amplitude;
      chromagramCtx.lineTo(x, y);
    }

    chromagramCtx.stroke();
  }

  chromagramCtx.beginPath();
  chromagramCtx.moveTo(0, chromagramCanvas.height);
  chromagramCtx.lineTo(chromagramCanvas.width, chromagramCanvas.height);
  chromagramCtx.strokeStyle = 'rgb(150, 150, 150)';
  chromagramCtx.stroke();

  chromagramCtx.fillStyle = 'rgb(255, 255, 255)';
  chromagramCtx.textAlign = 'center';

  for (var i = 0; i < numPitchClasses; i++) {
    var labelX = (i + 0.5) * binWidth;
    var labelY = chromagramCanvas.height - 10;
    chromagramCtx.fillText(pitchClasses[i], labelX, labelY);
  }

  chromagramCtx.textAlign = 'right';
  chromagramCtx.fillText('1', 10, 20);
  chromagramCtx.fillText('2', 10, chromagramCanvas.height * 0.3);
  chromagramCtx.fillText('3', 10, chromagramCanvas.height * 0.5);
  chromagramCtx.fillText('4', 10, chromagramCanvas.height * 0.7);
  chromagramCtx.fillText('5', 10, chromagramCanvas.height * 0.9);

  var pitchClass = getPitchClass();
  document.getElementById("chromagramValues").innerHTML = `<b>Pitch Class:</b> ${pitchClass}`;

  timeIndex++;
}

function drawSpectral() {
  if (!isPlaying) return;

  requestAnimationFrame(drawSpectral);
  analyser.getByteFrequencyData(dataArray);

  spectralCtx.clearRect(0, 0, spectralCanvas.width, spectralCanvas.height);
  spectralCtx.fillStyle = 'rgb(0, 0, 0)';
  spectralCtx.fillRect(0, 0, spectralCanvas.width, spectralCanvas.height);

  var binWidth = spectralCanvas.width / dataArray.length;

  for (var i = 0; i < dataArray.length; i++) {
    var hue = i * (360 / dataArray.length);
    var saturation = 100;
    var lightness = dataArray[i] / 2.55;

    spectralCtx.fillStyle = 'hsl(' + hue + ', ' + saturation + '%, ' + lightness + '%)';
    spectralCtx.fillRect(i * binWidth, spectralCanvas.height - (dataArray[i] / 2), binWidth, dataArray[i] / 2);
  }

  spectralCtx.beginPath();
  spectralCtx.moveTo(0, spectralCanvas.height);
  spectralCtx.lineTo(spectralCanvas.width, spectralCanvas.height);
  spectralCtx.strokeStyle = 'rgb(150, 150, 150)';
  spectralCtx.stroke();

  spectralCtx.beginPath();
  spectralCtx.moveTo(0, 0);
  spectralCtx.lineTo(0, spectralCanvas.height);
  spectralCtx.strokeStyle = 'rgb(150, 150, 150)';
  spectralCtx.stroke();

  spectralCtx.fillStyle = 'rgb(255, 255, 255)';
  spectralCtx.textAlign = 'right';

  var labelSpacing = spectralCanvas.height / 5;
  var startY = spectralCanvas.height - labelSpacing + labelSpacing / 5;

  for (var i = 0; i <= 5; i++) {
    var labelX = spectralCanvas.width - 10;
    var labelY = startY - i * labelSpacing;
    var magnitude = i * 20; 
    spectralCtx.fillText(magnitude + ' dB', labelX, labelY);
  }

  spectralCtx.textAlign = 'center';
  spectralCtx.fillText('0 Hz', 10, spectralCanvas.height - 5);
  spectralCtx.fillText('Sample Rate/2', spectralCanvas.width / 2, spectralCanvas.height - 5);
  spectralCtx.fillText('Sample Rate', spectralCanvas.width - 10, spectralCanvas.height - 5);

  var frequency = getFrequency();
  var magnitude = getMagnitude();
  document.getElementById("spectralValues").innerHTML = `<b>Frequency:</b> ${frequency} Hz <b>Magnitude:</b> ${magnitude} dB`;
}

function getAmplitude() {
  var minDecibels = analyser.minDecibels === -Infinity ? 0 : analyser.minDecibels;
  var maxDecibels = analyser.maxDecibels === -Infinity ? 0 : analyser.maxDecibels;
  var amplitude = 20 * (Math.log10(maxDecibels - minDecibels) - Math.log10(256)) + 100;
  return amplitude.toFixed(2);
}

  function getTime() {
    var time = audioContext.currentTime.toFixed(2);
    return time;
  }

  function getFrequency() {
    var maxIndex = 0;
    var maxMagnitude = 0;

    for (var i = 0; i < dataArray.length; i++) {
      if (dataArray[i] > maxMagnitude) {
        maxMagnitude = dataArray[i];
        maxIndex = i;
      }
    }

    var frequency = maxIndex * audioContext.sampleRate / analyser.fftSize;
    return frequency.toFixed(2);
  }

  function getMagnitude() {
    var maxMagnitude = 0;

    for (var i = 0; i < dataArray.length; i++) {
      if (dataArray[i] > maxMagnitude) {
        maxMagnitude = dataArray[i];
      }
    }

    var magnitude = 20 * (Math.log10(maxMagnitude) - Math.log10(256));
    return magnitude.toFixed(2);
  }

  function getPitchClass() {
    var maxIndex = 0;
    var maxMagnitude = 0;

    for (var i = 0; i < dataArray.length; i++) {
      if (dataArray[i] > maxMagnitude) {
        maxMagnitude = dataArray[i];
        maxIndex = i;
      }
    }

    var frequency = maxIndex * audioContext.sampleRate / analyser.fftSize;
    var pitchClass = frequency.toFixed(2);
    return pitchClass;
  }


// Search logs
document.getElementById("searchForm").addEventListener("submit", function (e) {
  e.preventDefault();
  searchLogs();
});

// Clear logs
document.getElementById("clearLogsButton").addEventListener("click", function () {
  clearLogs();
});

// Download PDF
document.getElementById("downloadForm").addEventListener("submit", function (e) {
  e.preventDefault();
  downloadPDF();
});

// Socket.IO event listener for new history logs
socket.on("new_history_log", function (newLog) {
  addNewHistoryLog(newLog);
});

// Function to search logs using AJAX
function searchLogs() {
const formData = new FormData(document.getElementById("searchForm"));
fetch("/search_logs", {
  method: "POST",
  body: formData,
})
  .then((response) => response.json())
  .then((data) => {
    updateHistoryLogsTable(data.search_results);
  })
  .catch((error) => {
    console.error("Error searching logs:", error);
  });
}

// Function to clear all logs using AJAX
function clearLogs() {
fetch("/clear_logs", {
  method: "POST",
})
  .then(() => {
    updateHistoryLogsTable([]);
  })
  .catch((error) => {
    console.error("Error clearing logs:", error);
  });
}

// Function to download the PDF using AJAX
function downloadPDF() {
const fromDate = document.getElementById("fromDate").value;
const toDate = document.getElementById("toDate").value;
const formData = new FormData();
formData.append("from_date", fromDate);
formData.append("to_date", toDate);
fetch("/download_pdf", {
  method: "POST",
  body: formData,
})
  .then((response) => response.blob())
  .then((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "distress_logs.pdf";
    a.click();
  })
  .catch((error) => {
    console.error("Error downloading PDF:", error);
  });
}

// Function to add a new history log to the table
function addNewHistoryLog(newLog) {
const tableBody = document.getElementById("historyLogsTableBody");
const newRow = document.createElement("tr");
newRow.innerHTML = `
  <td>${newLog.date}</td>
  <td>${newLog.time}</td>
  <td>${newLog.distress_type}</td>
  <td>
    <form action="/delete_log/${newLog.id}" method="POST">
      <button type="submit" class="btn btn-danger btn-sm">Delete</button>
    </form>
  </td>
`;
tableBody.insertBefore(newRow, tableBody.firstChild);
}

// Function to update the history logs table
function updateHistoryLogsTable(logs) {
const tableBody = document.getElementById("historyLogsTableBody");
tableBody.innerHTML = `
  <tr>
    <th>Date</th>
    <th>Time</th>
    <th>Distress Detected</th>
    <th>Action</th>
  </tr>
`;
logs.forEach((log) => {
  const newRow = document.createElement("tr");
  newRow.innerHTML = `
    <td>${log.date}</td>
    <td>${log.time}</td>
    <td>${log.distress_type}</td>
    <td>
      <form action="/delete_log/${log.id}" method="POST">
        <button type="submit" class="btn btn-danger btn-sm">Delete</button>
      </form>
    </td>
  `;
  tableBody.appendChild(newRow)
})};

socket.on("distress_counts", function (data) {
  var distressCounts = data;
  console.log("Received distress counts:", distressCounts);
})

// Define colors for the charts
var chartColors = [
  "rgba(255, 99, 132, 0.7)",
  "rgba(54, 162, 235, 0.7)",
  "rgba(255, 206, 86, 0.7)",
  // Add more colors as needed
];

// Initialize Socket.IO connection
var socket = io();

// Function to create and update the pie chart
var pieChart = null;

function createPieChart(data) {
  var ctx = document.getElementById("pieChart").getContext("2d");

  if (pieChart) {
    pieChart.destroy(); // Destroy the existing pie chart
  }

  pieChart = new Chart(ctx, {
    type: "pie",
    data: {
      labels: Object.keys(data), // Distress types
      datasets: [
        {
          data: Object.values(data), // Distress counts
          backgroundColor: chartColors, // Use consistent colors
        },
      ],
    },
    options: {
      // Customize chart options if needed
      responsive: true,
    },
  });
}


var canvas = document.getElementById('circleCanvas');
var context = canvas.getContext('2d');
var colors = ["rgba(255, 99, 132, 0.7)", "rgba(54, 162, 235, 0.7)", "rgba(255, 206, 86, 0.7)"];

function displayHorizontalBarGraph(data) {
  context.clearRect(0, 0, canvas.width, canvas.height);
  var totalCount = Object.values(data).reduce((a, b) => a + b, 0);
  var barWidth = 650; // Width of the bars
  var barHeight = 20; // Height of the bars
  var ySpacing = 20; // Vertical spacing between bars
  var currentY = 30; // Starting Y position

  for (var distressType in data) {
    var count = data[distressType];
    var percentage = ((count / totalCount) * 100).toFixed(2);
    var color = colors.shift();
    colors.push(color);

    // Draw the bar
    context.fillStyle = color;
    context.fillRect(150, currentY, (percentage / 100) * barWidth, barHeight); // Adjust the X position here

    // Display the label and percentage
    context.font = 'bold 10px Arial';
    context.fillStyle = 'black'; // Label color
    context.textAlign = 'left';
    context.textBaseline = 'middle';
    context.fillText(distressType, 10, currentY + barHeight / 2);

    context.fillStyle = 'black'; // Percentage color
    context.textAlign = 'center';
    context.fillText(percentage + '%', 150 + (percentage / 100) * barWidth / 2, currentY + barHeight / 2); // Adjust the X position here

    currentY += barHeight + ySpacing;
  }
}

// Initialize chartData and colors
var chartData = {
  colors: [],
};

// Function to create and update the pie chart on Socket.IO event
socket.on("distress_counts", function (data) {
  createPieChart(data);
});

// Function to update the percentage graph (horizontal bar graph) on Socket.IO event
socket.on("distress_counts", function (data) {
  displayHorizontalBarGraph(data);
});


});
