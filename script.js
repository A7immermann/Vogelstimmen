const audio = document.getElementById('myAudio');
const playBtn = document.getElementById('playBtn');
const progressBar = document.getElementById('progressBar');
const progressContainer = document.querySelector('.progress-container');
const visualizerContainer = document.getElementById('visualizer');

let isDragging = false;
let wasPlayingBeforeDrag = false;
let audioContext, analyser, dataArray, visualPath;

const POINT_COUNT = 80;
const VIS_HEIGHT = 100; 
let currentY = new Array(POINT_COUNT).fill(VIS_HEIGHT - 1);

function createSVGPath() {
    visualizerContainer.innerHTML = '';
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${POINT_COUNT} ${VIS_HEIGHT}`);
    svg.setAttribute("preserveAspectRatio", "none");

    visualPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    visualPath.setAttribute("fill", "none");
    visualPath.setAttribute("stroke", "black");
    visualPath.setAttribute("vector-effect", "non-scaling-stroke");
    visualPath.setAttribute("stroke-width", "1");
    visualPath.setAttribute("stroke-linecap", "butt"); 

    svg.appendChild(visualPath);
    visualizerContainer.appendChild(svg);
    drawRestState();
}

function drawRestState() {
    currentY.fill(VIS_HEIGHT - 1);
    visualPath.setAttribute("d", `M 0 ${VIS_HEIGHT - 1} L ${POINT_COUNT} ${VIS_HEIGHT - 1}`);
}

createSVGPath();

function initAudio() {
    if (audioContext) return;

    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // 1. Create the source
        const source = audioContext.createMediaElementSource(audio);
        
        // 2. Immediate Speaker Connection (Bypasses most 'not playing' bugs)
        source.connect(audioContext.destination);

        // 3. Setup Analyser for visualizer
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.3; 
        dataArray = new Uint8Array(analyser.frequencyBinCount);

        // 4. Connect source to analyser
        source.connect(analyser);
    } catch (e) {
        console.error("AudioContext failed, falling back to standard playback:", e);
    }
}

playBtn.addEventListener('click', () => {
    initAudio();
    
    // Resume context if it was suspended (browser policy)
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    
    if (audio.paused) {
        audio.play().catch(e => console.error("Playback failed:", e));
        playBtn.textContent = '⏸';
    } else {
        audio.pause();
        playBtn.textContent = '▶';
    }
});

// Listen for when the audio finishes playing
audio.addEventListener('ended', () => {
    // 1. Reset the button icon
    playBtn.textContent = '▶';
    
    // 2. Reset the progress bar width
    progressBar.style.width = '0%';
    
    // 3. Clear the visualizer line (optional, but looks cleaner)
    drawRestState();
});

function render() {
    if (!audio.paused && !isDragging && audio.duration) {
        progressBar.style.width = (audio.currentTime / audio.duration) * 100 + '%';
    }

    if (analyser && !audio.paused) {
        analyser.getByteFrequencyData(dataArray);
        const bufferLength = dataArray.length;
        let points = [];

        for (let i = 0; i < POINT_COUNT; i++) {
            const startOffset = 4;
            const baseIndex = startOffset + Math.floor((i / POINT_COUNT) * (bufferLength * 0.35));
            
            let val = (dataArray[baseIndex] + (dataArray[baseIndex-1] || 0) + (dataArray[baseIndex+1] || 0)) / 3;
            let norm = val / 255;
            let threshold = 0.30;
            let targetDisplacement = 0;

            if (norm > threshold) {
                let activeVal = (norm - threshold) / (1 - threshold);
                activeVal = Math.sin(activeVal * Math.PI / 2);
                targetDisplacement = Math.pow(activeVal, 1.2) * (VIS_HEIGHT * 0.95);
            }

            if (i === 0 || i === POINT_COUNT - 1) targetDisplacement = 0;

            const targetY = (VIS_HEIGHT - 1) - targetDisplacement;

            if (targetY < currentY[i]) {
                currentY[i] += (targetY - currentY[i]) * 0.8;
            } else {
                currentY[i] += (targetY - currentY[i]) * 0.15;
            }

            let xPos = (i / (POINT_COUNT - 1)) * POINT_COUNT;
            points.push({ x: xPos, y: currentY[i] });
        }

        let d = `M ${points[0].x} ${points[0].y}`;
        for (let i = 0; i < points.length - 1; i++) {
            const xc = (points[i].x + points[i + 1].x) / 2;
            const yc = (points[i].y + points[i + 1].y) / 2;
            d += ` Q ${points[i].x} ${points[i].y}, ${xc} ${yc}`;
        }
        visualPath.setAttribute("d", d);

    } else if (audio.paused && !isDragging) {
        drawRestState();
    }
    requestAnimationFrame(render);
}

requestAnimationFrame(render);

const handleMove = (e) => {
    const rect = progressContainer.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
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
        if (wasPlayingBeforeDrag) {
            audio.play();
            playBtn.textContent = '⏸';
        }
    }
});