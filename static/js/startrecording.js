  let stream;
  let audioContext;
  let scriptProcessor;
  let audioDataArray = [];

  async function startRecording() {
    try {
        // Initialize variables
        let stream, audioContext, scriptProcessor;
        const bufferSize = 4096; // Adjust buffer size as needed
        const sampleRate = 44100; // Adjust sample rate as needed
        const audioDataArray = [];

        // Request microphone access
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate });
        scriptProcessor = audioContext.createScriptProcessor(bufferSize, 1, 1);

        scriptProcessor.addEventListener('audioprocess', processAudio);

        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);
        analyser.connect(scriptProcessor);
        scriptProcessor.connect(audioContext.destination);

        let startTime = audioContext.currentTime;

        // Start sending audio data for real-time classification
        setInterval(() => {
            const currentTime = audioContext.currentTime;
            const elapsedTime = currentTime - startTime;
            if (elapsedTime >= 10) {
                startTime = currentTime;
                sendAudioData(audioDataArray.splice(0));
            }
        }, 5000); // Adjust the interval as needed, this value checks every 100ms
    } catch (err) {
        console.error(err);
    }
}

function processAudio(event) {
    const audioData = event.inputBuffer.getChannelData(0);
    audioDataArray.push(...audioData);
}

function sendAudioData(audioData) {
    fetch('/classify', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ audio_data: Array.from(audioData) }),
    })
    .then(response => response.text())
    .then(result => {
        // Update the content of the result div with the classification result
        document.getElementById('result').textContent = result;
    })
    .catch(error => {
        console.error(error);
    });
}

// Call the startRecording function when the page loads
document.addEventListener('DOMContentLoaded', startRecording);
