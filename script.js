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

/**
 * 1. UI Reset Logic
 * Resets button, bar, and visualizer to original state
 */
function resetPlayerUI() {
    playBtn.textContent = '▶';
    progressBar.style.width = '0%';
    drawRestState();
}

/**
 * 2. Visualizer Setup
 */
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

/**
 * 3. Audio Context Initialization
 */
function initAudio() {
    if (audioContext) return;

    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaElementSource(audio);
        
        // Connect to speakers first (Safe Playback)
        source.connect(audioContext.destination);

        analyser = audioContext.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.3; 
        dataArray = new Uint8Array(analyser.frequencyBinCount);

        // Connect to analyser for visuals
        source.connect(analyser);
    } catch (e) {
        console.error("AudioContext initialization failed:", e);
    }
}

/**
 * 4. Control Listeners
 */
playBtn.addEventListener('click', () => {
    initAudio();
    
    if (audioContext && audioContext.state === 'suspended') {
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

// The specific fix for resetting when the audio ends
audio.onended = () => {
    resetPlayerUI();
};

/**
 * 5. The Render Loop (Visuals & Progress)
 */
function render() {
    // Update Progress Bar
    if (!audio.paused && !isDragging && audio.duration) {
        const progress = (audio.currentTime / audio.duration);
        progressBar.style.width = (progress * 100) + '%';
    }

    // Update Visualizer
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

            // Pin edges to the floor
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

/**
 * 6. Dragging / Seeking Logic
 */
const handleMove = (e) => {
    const rect = progressContainer.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const width = progressContainer.clientWidth;
    let percentage = Math.max(0, Math.min((x / width) * 100, 100));
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
        // If we dragged it to the very end, reset UI
        if (audio.currentTime >= audio.duration) {
            resetPlayerUI();
        } else if (wasPlayingBeforeDrag) {
            audio.play();
            playBtn.textContent = '⏸';
        } else {
            playBtn.textContent = '▶';
        }
    }
});