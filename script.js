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
    
    // 512 gives us more data points to sample from for better frequency distribution
    analyser.fftSize = 512; 
    analyser.smoothingTimeConstant = 0.75; // Smoother transitions between bar heights
    
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

// 4. Liquid Render Loop (Progress + Visualizer)
function render() {
    if (!audio.paused && !isDragging && audio.duration) {
        const percentage = (audio.currentTime / audio.duration) * 100;
        progressBar.style.width = percentage + '%';
    }

    if (analyser && !audio.paused) {
        analyser.getByteFrequencyData(dataArray);
        
        for (let i = 0; i < BAR_COUNT; i++) {
            // OPTIMIZED FOR BIRD CALLS:
            // 1.1 exponent makes the distribution feel less "bunched up"
            // 0.2 multiplier ignores the high-frequency silence above bird range
            const index = Math.floor(Math.pow(i / BAR_COUNT, 1.1) * (dataArray.length * 0.2));
            const val = dataArray[index];
            
            // Boost the height slightly (* 1.2) so the chirps look more energetic
            const height = Math.min(100, (val / 255) * 100 * 1.2); 

            if (height > 2) {
                barElements[i].style.height = height + '%';
                barElements[i].style.opacity = "1";
            } else {
                barElements[i].style.height = "0";
                barElements[i].style.opacity = "0";
            }
        }
    } else if (analyser && audio.paused) {
        barElements.forEach(bar => {
            bar.style.height = '0';
            bar.style.opacity = "0";
        });
    }
    requestAnimationFrame(render);
}
requestAnimationFrame(render);

// 5. Dragging Logic
const handleMove = (e) => {
    const rect = progressContainer.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = progressContainer.clientWidth;
    let percentage = Math.max(0, Math.min((x / width) * 100, 100));
    
    // Update visuals instantly for responsiveness
    progressBar.style.width = percentage + '%';
    
    if (audio.duration) {
        audio.currentTime = (percentage / 100) * audio.duration;
    }
};

progressContainer.addEventListener('mousedown', (e) => {
    isDragging = true;
    wasPlayingBeforeDrag = !audio.paused;
    audio.pause();
    handleMove(e);
});

window.addEventListener('mousemove', (e) => { 
    if (isDragging) handleMove(e); 
});

window.addEventListener('mouseup', () => {
    if (isDragging) {
        isDragging = false;
        if (wasPlayingBeforeDrag) {
            audio.play();
            playBtn.textContent = '⏸';
        }
    }
});