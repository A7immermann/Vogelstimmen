const audio = document.getElementById('myAudio');
const playBtn = document.getElementById('playBtn');
const progressBar = document.getElementById('progressBar');
const progressContainer = document.querySelector('.progress-container');
const visualizerContainer = document.getElementById('visualizer');

let isDragging = false;
let wasPlayingBeforeDrag = false;
let audioContext, analyser, dataArray, visualPath;

const POINT_COUNT = 100; // More points for sharper peaks
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
    // A clean flat line at the bottom
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
    
    // 2048 provides more granular frequency data
    analyser.fftSize = 2048;
    // Lower smoothing (0.4) makes the peaks react instantly (steeper)
    analyser.smoothingTimeConstant = 0.4; 
    
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
            // Sampling logic: looking at the specific bird-chirp range
            const index = Math.floor((i / POINT_COUNT) * (bufferLength * 0.35));
            let val = dataArray[index];
            
            // 1. HARD THRESHOLD (The Noise Gate)
            // Anything below 140 (out of 255) is treated as 0 to kill background noise
            const threshold = 140;
            if (val < threshold) {
                val = 0;
            } else {
                // Re-scale the value to a 0-1 range after the threshold
                val = (val - threshold) / (255 - threshold);
            }
            
            // 2. EXTREME POWER SCALING
            // Raising to the 8th power ensures only the tip of the peak shows
            let extremePeak = Math.pow(val, 8); 
            
            const displacement = extremePeak * (VIS_HEIGHT * 0.95);
            
            const x = i; 
            const y = (VIS_HEIGHT - 1) - displacement; 
            points.push({ x, y });
        }

        // Connect points with a sharp "Linear" move to emphasize the peaks
        // (Switched from Q to L for a more "scientific/stark" look)
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
    const rect =