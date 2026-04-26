const audio = document.getElementById('myAudio');
const playBtn = document.getElementById('playBtn');
const progressBar = document.getElementById('progressBar');
const progressContainer = document.querySelector('.progress-container');
const visualizerContainer = document.getElementById('visualizer');

let isDragging = false;
let wasPlayingBeforeDrag = false;
let audioContext, analyser, dataArray;
let visualPath; // The SVG path element

// 1. Setup SVG Visualizer (Single Path)
const POINT_COUNT = 32; 
const VIS_HEIGHT = 80;
function createSVGPath() {
    visualizerContainer.innerHTML = ''; 
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${POINT_COUNT * 2} ${VIS_HEIGHT}`);
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute("preserveAspectRatio", "none");
    
    visualPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    visualPath.setAttribute("fill", "none");
    visualPath.setAttribute("stroke", "black");
    visualPath.setAttribute("stroke-width", "0.5");
    visualPath.setAttribute("stroke-linecap", "round");
    visualPath.setAttribute("stroke-linejoin", "round");
    visualPath.setAttribute("opacity", "0");
    
    // Smooth transition for the path movement
    visualPath.style.transition = "opacity 0.3s ease";
    
    svg.appendChild(visualPath);
    visualizerContainer.appendChild(svg);
}
createSVGPath();

// 2. Initialize Web Audio
function initAudioContext() {
    if (audioContext) return;
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaElementSource(audio);
    analyser = audioContext.createAnalyser();
    source.connect(analyser);
    analyser.connect(audioContext.destination);
    analyser.fftSize = 512; 
    analyser.smoothingTimeConstant = 0.85; // Slightly higher for smoother curves
    dataArray = new Uint8Array(analyser.frequencyBinCount);
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

// 4. Render Loop (Curve Generation)
function render() {
    if (!audio.paused && !isDragging && audio.duration) {
        progressBar.style.width = (audio.currentTime / audio.duration) * 100 + '%';
    }

    if (analyser && !audio.paused) {
        analyser.getByteFrequencyData(dataArray);
        visualPath.setAttribute("opacity", "1");

        let points = [];
        for (let i = 0; i < POINT_COUNT; i++) {
            const index = Math.floor(Math.pow(i / POINT_COUNT, 1.1) * (dataArray.length * 0.2));
            const val = dataArray[index];
            
            let logFactor = val > 0 ? Math.log10(val + 1) / Math.log10(256) : 0;
            const displacement = logFactor * (VIS_HEIGHT * 0.8); // Scale for impact
            
            const x = i * 2;
            const y = (VIS_HEIGHT - 5) - displacement; // Baseline near bottom
            points.push({x, y});
        }

        // Generate the SVG Path string (using Quadratic Curves for smoothness)
        let d = `M ${points[0].x} ${points[0].y}`;
        for (let i = 0; i < points.length - 1; i++) {
            const xc = (points[i].x + points[i + 1].x) / 2;
            const yc = (points[i].y + points[i + 1].y) / 2;
            d += ` Q ${points[i].x} ${points[i].y}, ${xc} ${yc}`;
        }
        visualPath.setAttribute("d", d);

    } else if (audio.paused) {
        visualPath.setAttribute("opacity", "0");
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