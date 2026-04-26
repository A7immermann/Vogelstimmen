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
    for (let i = 0; i < BAR_COUNT; i++) {
        const bar = document.createElement('div');
        bar.className = 'vis-bar';
        visualizerContainer.appendChild(bar);
    }
    barElements = document.querySelectorAll('.vis-bar');
}
createBars();

// 2. Initialize Web Audio (must be on user click)
function initAudioContext() {
    if (audioContext) return;
    
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaElementSource(audio);
    analyser = audioContext.createAnalyser();
    
    source.connect(analyser);
    analyser.connect(audioContext.destination);
    
    analyser.fftSize = 64; // Smaller = fewer bars/lower resolution
    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
}

// 3. Play/Pause Toggle
playBtn.addEventListener('click', () => {
    initAudioContext(); // Initialize context on first click
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

// 4. Liquid Render Loop (Progress + Visualizer)
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
            const val = dataArray[i];
            const height = (val / 255) * 100; // Normalize to percentage
            barElements[i].style.height = height + '%';
        }
    } else if (analyser && audio.paused) {
        // Slowly drop bars to 0 when paused
        barElements.forEach(bar => bar.style.height = '2px');
    }

    requestAnimationFrame(render);
}
requestAnimationFrame(render);

// 5. Dragging Logic (Keep your smooth dragging)
const handleMove = (e) => {
    const rect = progressContainer.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = progressContainer.clientWidth;
    let percentage = Math.max(0, Math.min((x / width) * 100, 100));
    progressBar.style.width = percentage + '%';
    if (audio.duration) audio.currentTime = (percentage / 100) * audio.duration;
};

progressContainer.addEventListener('mousedown', (e) => {
    isDragging = true;
    wasPlayingBeforeDrag = !audio.paused;
    audio.pause();
    handleMove(e);
});

window.addEventListener('mousemove', (e) => { if (isDragging) handleMove(e); });
window.addEventListener('mouseup', () => {
    if (isDragging) {
        isDragging = false;
        if (wasPlayingBeforeDrag) audio.play();
    }
});