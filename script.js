const audio = document.getElementById('myAudio');
const playBtn = document.getElementById('playBtn');
const progressBar = document.getElementById('progressBar');
const progressContainer = document.querySelector('.progress-container');
const visualizerContainer = document.getElementById('visualizer');

let isDragging = false;
let wasPlayingBeforeDrag = false;
let audioContext, analyser, dataArray, visualPath;

const POINT_COUNT = 80; // More points for a sharper, detailed line
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
    
    // Always visible
    visualPath.setAttribute("opacity", "1");
    
    svg.appendChild(visualPath);
    visualizerContainer.appendChild(svg);
    
    // Initialize the line at the bottom rest position
    drawRestState();
}

function drawRestState() {
    let d = `M 0 ${VIS_HEIGHT - 1}`;
    for (let i = 1; i < POINT_COUNT; i++) {
        d += ` L ${i} ${VIS_HEIGHT - 1}`;
    }
    visualPath.setAttribute("d", d);
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
    
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.6; // Faster response for "loudness peaks"
    
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
            // Focus on bird frequency range (0 to 40% of spectrum)
            const index = Math.floor((i / POINT_COUNT) * (bufferLength * 0.4));
            const val = dataArray[index];
            
            // 1. Logarithmic base
            let norm = val / 255; 
            
            // 2. Exponential "Gate": Raising to a high power (like 4 or 5)
            // This makes small/medium values nearly 0 and only high values pop.
            let extremeLog = Math.pow(norm, 5); 
            
            const displacement = extremeLog * (VIS_HEIGHT * 0.9);
            
            const x = i; 
            const y = (VIS_HEIGHT - 1) - displacement; 
            points.push({ x, y });
        }

        let d = `M ${points[0].x} ${points[0].y}`;
        for (let i = 0; i < points.length - 1; i++) {
            const xc = (points[i].x + points[i + 1].x) / 2;
            const yc = (points[i].y + points[i + 1].y) / 2;
            d += ` Q ${points[i].x} ${points[i].y}, ${xc} ${yc}`;
        }
        visualPath.setAttribute("d", d);
    } else if (audio.paused) {
        // Line stays visible but flat when paused
        drawRestState();
    }
    requestAnimationFrame(render);
}
requestAnimationFrame(render);

// Dragging Logic (keeping existing functionality)
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