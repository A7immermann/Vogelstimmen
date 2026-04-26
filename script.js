const audio = document.getElementById('myAudio');
const playBtn = document.getElementById('playBtn');
const progressBar = document.getElementById('progressBar');
const progressContainer = document.querySelector('.progress-container');
const visualizerContainer = document.getElementById('visualizer');

let isDragging = false;
let wasPlayingBeforeDrag = false;
let audioContext, analyser, dataArray, visualPath;

const POINT_COUNT = 100; 
const VIS_HEIGHT = 80;

function createSVGPath() {
    visualizerContainer.innerHTML = ''; 
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${POINT_COUNT} ${VIS_HEIGHT}`);
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute("preserveAspectRatio", "none");
    
    visualPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    visualPath.setAttribute("fill", "none");
    visualPath.setAttribute("stroke", "black");
    visualPath.setAttribute("vector-effect", "non-scaling-stroke");
    visualPath.setAttribute("stroke-width", "1");
    visualPath.setAttribute("opacity", "1");
    
    svg.appendChild(visualPath);
    visualizerContainer.appendChild(svg);
    drawRestState();
}

function drawRestState() {
    visualPath.setAttribute("d", `M 0 ${VIS_HEIGHT - 1} L ${POINT_COUNT} ${VIS_HEIGHT - 1}`);
}

createSVGPath();

function initAudio() {
    if (audioContext) return;
    audio.crossOrigin = "anonymous";
    audio.src = "../audio/km.mp3" + "?v=" + Date.now(); 
    audio.load();

    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaElementSource(audio);
    analyser = audioContext.createAnalyser();
    
    analyser.fftSize = 1024; // Smaller FFT = faster, sharper response
    // Low smoothing (0.5) makes it "jitter" less but react to peaks instantly
    analyser.smoothingTimeConstant = 0.5; 
    
    source.connect(analyser);
    analyser.connect(audioContext.destination);
    dataArray = new Uint8Array(analyser.frequencyBinCount);
}

playBtn.addEventListener('click', () => {
    initAudio();
    if (audioContext.state === 'suspended') audioContext.resume();
    audio.paused ? (audio.play(), playBtn.textContent = '⏸') : (audio.pause(), playBtn.textContent = '▶');
});

function render() {
    if (!audio.paused && !isDragging && audio.duration) {
        progressBar.style.width = (audio.currentTime / audio.duration) * 100 + '%';
    }

    if (analyser && !audio.paused) {
        analyser.getByteFrequencyData(dataArray);

        let points = [];
        const bufferLength = dataArray.length;

        for (let i = 0; i < POINT_COUNT; i++) {
            // Sampling the bird's high-pitch range
            const index = Math.floor((i / POINT_COUNT) * (bufferLength * 0.45));
            let val = dataArray[index];
            
            // 1. THE "CHILL" LOGIC:
            // Convert to a 0-1 scale
            let norm = val / 255;
            
            // 2. THE THRESHOLD (Kill background noise)
            // If the sound is less than 40% of max volume, it stays at 0.
            let threshold = 0.4;
            let activeVal = 0;
            if (norm > threshold) {
                // Re-map the range so it pops out from the baseline sharply
                activeVal = (norm - threshold) / (1 - threshold);
            }

            // 3. LOUDNESS SCALING
            // We use a modest power (1.5) so it feels snappy, not heavy.
            const displacement = Math.pow(activeVal, 1.5) * (VIS_HEIGHT * 0.9);
            
            const x = i; 
            const y = (VIS_HEIGHT - 1) - displacement; 
            points.push({ x, y });
        }

        // Draw with "Linear" lines to keep the peaks looking like steep needles
        let d = `M ${points[0].x} ${points[0].y}`;
        for (let i = 1; i < points.length; i++) {
            d += ` L ${points[i].x} ${points[i].y}`;
        }
        visualPath.setAttribute("d", d);

    } else if (audio.paused) {
        drawRestState();
    }
    requestAnimationFrame(render);
}
requestAnimationFrame(render);

// Dragging Logic
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