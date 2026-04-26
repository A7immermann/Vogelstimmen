const audio = document.getElementById('myAudio');
const playBtn = document.getElementById('playBtn');
const progressBar = document.getElementById('progressBar');
const progressContainer = document.querySelector('.progress-container');
const visualizerContainer = document.getElementById('visualizer');

let isDragging = false;
let wasPlayingBeforeDrag = false;
let audioContext, analyser, dataArray, visualPath;

const POINT_COUNT = 64; // Increased for a smoother line
const VIS_HEIGHT = 80;

function createSVGPath() {
    visualizerContainer.innerHTML = ''; 
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    
    // We set the viewBox width to POINT_COUNT to make math 1:1
    svg.setAttribute("viewBox", `0 0 ${POINT_COUNT} ${VIS_HEIGHT}`);
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    
    // "none" allows the line to stretch to the container width exactly
    svg.setAttribute("preserveAspectRatio", "none");
    
    visualPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    visualPath.setAttribute("fill", "none");
    visualPath.setAttribute("stroke", "black");
    
    // Use vector-effect to keep the 1px thickness consistent regardless of scaling
    visualPath.setAttribute("vector-effect", "non-scaling-stroke");
    visualPath.setAttribute("stroke-width", "1");
    
    visualPath.setAttribute("opacity", "0");
    visualPath.style.transition = "opacity 0.3s ease";
    
    svg.appendChild(visualPath);
    visualizerContainer.appendChild(svg);
}
createSVGPath();

function initAudio() {
    if (audioContext) return;
    audio.crossOrigin = "anonymous";
    const cacheBuster = "?v=" + Date.now();
    audio.src = "../audio/km.mp3" + cacheBuster; 
    audio.load();

    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaElementSource(audio);
    analyser = audioContext.createAnalyser();
    
    // Higher FFT for better high-frequency detail
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.75; // Less smoothing = more "wiggle"
    
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
        visualPath.setAttribute("opacity", "1");

        let points = [];
        const bufferLength = dataArray.length;

        for (let i = 0; i < POINT_COUNT; i++) {
            // Updated Distribution: i / POINT_COUNT covers the whole range.
            // Bird songs are high, so we look at the first 40% of the buffer (0.4)
            // Lowered the exponent (1.0) to keep it more linear/wide.
            const index = Math.floor((i / POINT_COUNT) * (bufferLength * 0.4));
            const val = dataArray[index];
            
            let logHeight = val > 0 ? Math.log10(val + 1) / Math.log10(256) : 0;
            
            // To stop the "jump," we use a lower multiplier
            const displacement = logHeight * (VIS_HEIGHT * 0.7);
            
            const x = i; 
            // Baseline is now at the very bottom (VIS_HEIGHT - 1)
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
        visualPath.setAttribute("opacity", "0");
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