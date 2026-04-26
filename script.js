const audio = document.getElementById('myAudio');
const playBtn = document.getElementById('playBtn');
const progressBar = document.getElementById('progressBar');
const progressContainer = document.querySelector('.progress-container');
const visualizerContainer = document.getElementById('visualizer');

let isDragging = false;
let wasPlayingBeforeDrag = false;
let audioContext, analyser, dataArray, barElements;

// 1. Setup Visualizer Bars
const BAR_COUNT = 32;
function createBars() {
    // Clear container to prevent duplicates
    visualizerContainer.innerHTML = ''; 
    for (let i = 0; i < BAR_COUNT; i++) {
        const bar = document.createElement('div');
        bar.className = 'vis-bar';
        visualizerContainer.appendChild(bar);
    }
    barElements = document.querySelectorAll('.vis-bar');
}
createBars();

// 2. Initialize Web Audio (Handled on first user interaction)
function initAudioContext() {
    if (audioContext) return;
    
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaElementSource(audio);
    analyser = audioContext.createAnalyser();
    
    source.connect(analyser);
    analyser.connect(audioContext.destination);
    
    // 512 provides high resolution for the sampling math below
    analyser.fftSize = 512; 
    // Smooths out the vertical jittering
    analyser.smoothingTimeConstant = 0.8; 
    
    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
}

// 3. Play/Pause Toggle
playBtn.addEventListener('click', () => {
    initAudioContext(); 
    if (audioContext.state === 'suspended') audioContext.resume();
    togglePlay();
});

function togglePlay() {
    if (audio.paused) {
        audio.play();
        playBtn.textContent = '⏸';
    } else {
        audio.pause();
        playBtn.textContent = '▶';
    }
}

// 4. Liquid Render Loop (Progress + Logarithmic Visualizer)
function render() {
    // A. Update Progress Bar
    if (!audio.paused && !isDragging && audio.duration) {
        const percentage = (audio.currentTime / audio.duration) * 100;
        progressBar.style.width = percentage + '%';
    }

    // B. Update Visualizer Bars
    if (analyser && !audio.paused) {
        analyser.getByteFrequencyData(dataArray);
        
        for (let i = 0; i < BAR_COUNT; i++) {
            // LOG FREQUENCY: Zoom into the bird-song range (lower 20% of spectrum)
            const index = Math.floor(Math.pow(i / BAR_COUNT, 1.1) * (dataArray.length * 0.2));
            const val = dataArray[index];
            
            // LOG LOUDNESS: Calculate height using logarithmic scaling for dB-like feel
            let logHeight = 0;
            if (val > 0) {
                // Natural volume curve: rises fast at low levels, tapers at high levels
                logHeight = Math.log10(val + 1) / Math.log10(256);
            }

            // Apply a 1.25x boost to ensure