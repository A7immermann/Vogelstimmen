const audio = document.getElementById('myAudio');
const playBtn = document.getElementById('playBtn');
const progressBar = document.getElementById('progressBar');
const progressContainer = document.querySelector('.progress-container');
const visualizerContainer = document.getElementById('visualizer');

let isDragging = false;
let wasPlayingBeforeDrag = false;
let audioContext, analyser, dataArray, visualPath;

const POINT_COUNT = 80;
const VIS_HEIGHT = 100; // Internal SVG coordinate scale
let currentY = new Array(POINT_COUNT).fill(VIS_HEIGHT - 1);

/**
 * Creates the SVG element and the path for the line visualizer.
 * Sets 'preserveAspectRatio' to none to allow the clipping mask overshoot.
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
    // 'butt' prevents rounded caps from jumping at the edges
    visualPath.setAttribute("stroke-linecap", "butt"); 

    svg.appendChild(visualPath);
    visualizerContainer.appendChild(svg);
    drawRestState();
}

/**
 * Returns the visualizer to a flat line.
 */
function drawRestState() {
    currentY.fill(VIS_HEIGHT - 1);
    visualPath.setAttribute("d", `M 0 ${VIS_HEIGHT - 1} L ${POINT_COUNT} ${VIS_HEIGHT - 1}`);
}

createSVGPath();

/**
 * Initializes the Web Audio API. 
 * Universal: It uses the 'src' already defined in your HTML.
 */
function initAudio() {
    if (audioContext) return;

    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaElementSource(audio);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.3;

    source.connect(analyser);
    analyser.connect(audioContext.destination);
}