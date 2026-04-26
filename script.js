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
    visualPath.setAttribute("stroke-linecap", "round"); // Softer line ends
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
    
    analyser.fftSize = 1024;
    // High smoothing helps the overall "form" of the peaks stay stable
    analyser.smoothingTimeConstant = 0.85; 
    
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
            // 1. DATA SMOOTHING (Moving Average)
            // Instead of one index, we average 3 neighboring indices to kill tiny jitters
            const baseIndex = Math.floor((i / POINT_COUNT) * (bufferLength * 0.45));
            let val = (dataArray[baseIndex] + (dataArray[baseIndex-1] || 0) + (dataArray[baseIndex+1] || 0)) / 3;
            
            let norm = val / 255;
            
            // 2. SMOOTH NOISE GATE (Sine-based transition)
            // Anything below 0.35 volume is zeroed out.
            // Anything above fades in smoothly rather than popping.
            let threshold = 0.35;
            let activeVal = 0;
            if (norm > threshold) {
                activeVal = (norm - threshold) / (1 - threshold);
                // Apply a sine curve to the base of the peak for a smooth "fade-in"
                activeVal = Math.sin(activeVal * Math.PI / 2);
            }

            // Apply a slight power to keep the peak shape elegant
            const displacement = Math.pow(activeVal, 1.2) * (VIS_HEIGHT * 0.85);
            
            const x = i; 
            const y = (VIS_HEIGHT - 1) - displacement; 
            points.push({ x, y });
        }

        // 3. CUBIC INTERPOLATION
        // Using Quadratic Bézier curves (Q) to make the line look like a silk thread
        let d = `M ${points[0].x} ${points[0].y}`;
        for (let i = 0; i < points.length - 1; i++) {
            const xc = (points[i].x + points[i + 1].x) / 2;
            const yc = (points[i].y + points[i + 1].y) / 2;
            d += ` Q ${points[i].x} ${points[i].y}, ${xc} ${yc}`;
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