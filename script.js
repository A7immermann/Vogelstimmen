const audio = document.getElementById('myAudio');
const playBtn = document.getElementById('playBtn');
const progressBar = document.getElementById('progressBar');
const progressContainer = document.querySelector('.progress-container');
const visualizerContainer = document.getElementById('visualizer');

let isDragging = false;
let wasPlayingBeforeDrag = false;
let audioContext, analyser, dataArray, visualPath;

const POINT_COUNT = 32; 
const VIS_HEIGHT = 80;

// 1. Create the SVG Line Path
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
    visualPath.setAttribute("stroke-width", "0.6");
    visualPath.setAttribute("opacity", "0");
    visualPath.style.transition = "opacity 0.3s ease";
    
    svg.appendChild(visualPath);
    visualizerContainer.appendChild(svg);
}
createSVGPath();

// 2. Initialize Audio (With CORS fix)
function initAudio() {
    if (audioContext) return;
    
    audio.crossOrigin = "anonymous";
    audio.src = "../audio/km.mp3"; // Adjust path if needed
    
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaElementSource(audio);
    analyser = audioContext.createAnalyser();
    
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.85;
    
    source.connect(analyser);
    analyser.connect(audioContext.destination);
    
    dataArray = new Uint8Array(analyser.frequencyBinCount);
}

// 3. Play/Pause
playBtn.addEventListener('click', () => {
    initAudio();
    if (audioContext.state === 'suspended') audioContext.resume();
    
    if (audio.paused) {
        audio.play();
        playBtn.textContent = '⏸';
    } else {
        audio.pause();
        playBtn.textContent = '▶';
    }
});

// 4. The Render Loop
function render() {
    // Progress Bar
    if (!audio.paused && !isDragging && audio.duration) {
        progressBar.style.width = (audio.currentTime / audio.duration) * 100 + '%';
    }

    // Visualizer Curve
    if (analyser && !audio.paused) {
        analyser.getByteFrequencyData(dataArray);
        visualPath.setAttribute("opacity", "1");

        let points = [];
        for (let i = 0; i < POINT_COUNT; i++) {
            // Bird Frequency logic (focused on low-mid)
            const index = Math.floor(Math.pow(i / POINT_COUNT, 1.1) * (dataArray.length * 0.2));
            const val = dataArray[index];
            
            // Logarithmic Loudness
            let logHeight = val > 0 ? Math.log10(val + 1) / Math.log10(256) : 0;
            const displacement = logHeight * (VIS_HEIGHT * 0.85);
            
            points.push({ x: i * 2, y: (VIS_HEIGHT - 2) - displacement });
        }

        // Connect points with a smooth Quadratic Curve string
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

// 5. Dragging
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