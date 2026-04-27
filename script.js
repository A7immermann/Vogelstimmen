const audio = document.getElementById('myAudio');
const playBtn = document.getElementById('playBtn');
const progressBar = document.getElementById('progressBar');
const progressContainer = document.querySelector('.progress-container');
const visualizerContainer = document.getElementById('visualizer');
const menuBtn = document.getElementById('menuBtn');
const dropdownMenu = document.getElementById('dropdownMenu');
const menuLinks = document.querySelectorAll('.dropdown-content a');

let isDragging = false;
let wasPlayingBeforeDrag = false;
let audioContext, analyser, dataArray, visualPath;

const POINT_COUNT = 80;
const VIS_HEIGHT = 100; 
let currentY = new Array(POINT_COUNT).fill(VIS_HEIGHT - 1);

// SVG Icons
const ICON_PLAY = `<svg viewBox="0 0 24 24" width="22" height="22" fill="black" style="display:block;"><path d="M5 5v14l15-7z" stroke="black" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
const ICON_PAUSE = `<svg viewBox="0 0 24 24" width="22" height="22" fill="black" style="display:block;"><rect x="5" y="5" width="4" height="14" rx="1.5" stroke="black" stroke-width="1.5"/><rect x="15" y="5" width="4" height="14" rx="1.5" stroke="black" stroke-width="1.5"/></svg>`;

function resetPlayerUI() {
    playBtn.innerHTML = ICON_PLAY;
    progressBar.style.width = '0%';
    drawRestState();
}

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
    if (visualPath) visualPath.setAttribute("d", `M 0 ${VIS_HEIGHT - 1} L ${POINT_COUNT} ${VIS_HEIGHT - 1}`);
}

createSVGPath();

function initAudio() {
    if (audioContext) return;
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaElementSource(audio);
        source.connect(audioContext.destination);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.3; 
        dataArray = new Uint8Array(analyser.frequencyBinCount);
        source.connect(analyser);
    } catch (e) {
        console.error("AudioContext failed:", e);
    }
}

playBtn.addEventListener('click', () => {
    isDragging = false;
    initAudio();
    if (audioContext && audioContext.state === 'suspended') audioContext.resume();
    
    if (audio.paused) {
        audio.play().catch(e => console.error(e));
        playBtn.innerHTML = ICON_PAUSE;
    } else {
        audio.pause();
        playBtn.innerHTML = ICON_PLAY;
    }
});

audio.onended = () => { resetPlayerUI(); };

function render() {
    if (!audio.paused && !isDragging && audio.duration) {
        const progress = (audio.currentTime / audio.duration);
        progressBar.style.width = (progress * 100) + '%';
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
            if (targetY < currentY[i]) { currentY[i] += (targetY - currentY[i]) * 0.8; } 
            else { currentY[i] += (targetY - currentY[i]) * 0.15; }
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

// --- PLAYER DRAG LOGIC ---
const handleMove = (e) => {
    const rect = progressContainer.getBoundingClientRect();
    let clientX = (e.touches && e.touches[0]) ? e.touches[0].clientX : e.clientX;
    const x = clientX - rect.left;
    const width = progressContainer.clientWidth;
    let percentage = Math.max(0, Math.min((x / width) * 100, 100));
    progressBar.style.width = percentage + '%';
    if (audio.duration) audio.currentTime = (percentage / 100) * audio.duration;
};

const startDrag = (e) => {
    isDragging = true;
    wasPlayingBeforeDrag = !audio.paused;
    audio.pause();
    handleMove(e);
};

const stopDrag = () => {
    if (!isDragging) return;
    isDragging = false;
    if (audio.currentTime >= audio.duration) {
        resetPlayerUI();
    } else if (wasPlayingBeforeDrag) {
        audio.play();
        playBtn.innerHTML = ICON_PAUSE;
    } else {
        playBtn.innerHTML = ICON_PLAY;
    }
};

progressContainer.addEventListener('mousedown', startDrag);
progressContainer.addEventListener('touchstart', (e) => {
    if (e.cancelable) e.preventDefault();
    startDrag(e);
}, { passive: false });

window.addEventListener('mousemove', (e) => { if (isDragging) handleMove(e); });
window.addEventListener('touchmove', (e) => { 
    if (isDragging) {
        if (e.cancelable) e.preventDefault();
        handleMove(e);
    }
}, { passive: false });

window.addEventListener('mouseup', stopDrag);
window.addEventListener('touchend', stopDrag);
window.addEventListener('touchcancel', stopDrag);

// --- SANDWICH MENU LOGIC ---
if (menuBtn) {
    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Clear all highlights before opening
        menuLinks.forEach(l => l.classList.remove('active-touch'));
        dropdownMenu.classList.toggle('show');
    });
}

// Close menu if user clicks/taps outside
window.addEventListener('click', (e) => {
    if (dropdownMenu && dropdownMenu.classList.contains('show')) {
        // Only close if the click wasn't inside the menu button
        if (!menuBtn.contains(e.target)) {
            dropdownMenu.classList.remove('show');
        }
    }
});

// --- MOBILE SWIPE-TO-HIGHLIGHT ---
dropdownMenu.addEventListener('touchstart', (e) => {
    menuLinks.forEach(l => l.classList.remove('active-touch'));
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const link = el?.closest('a');
    if (link) link.classList.add('active-touch');
}, { passive: true });

dropdownMenu.addEventListener('touchmove', (e) => {
    if (dropdownMenu.classList.contains('show')) {
        e.preventDefault(); // Stop page scroll while picking
        const touch = e.touches[0];
        const el = document.elementFromPoint(touch.clientX, touch.clientY);
        const link = el?.closest('a');
        
        menuLinks.forEach(l => {
            if (l === link) {
                l.classList.add('active-touch');
            } else {
                l.classList.remove('active-touch');
            }
        });
    }
}, { passive: false });

dropdownMenu.addEventListener('touchend', (e) => {
    const activeLink = dropdownMenu.querySelector('.active-touch');
    if (activeLink) {
        const url = activeLink.getAttribute('href');
        // CRITICAL: Hide menu immediately before navigating
        dropdownMenu.classList.remove('show'); 
        window.location.href = url;
    }
});

// --- THE "BACK BUTTON" REPAIR ---
window.addEventListener('pageshow', (event) => {
    // 'persisted' is true if the page was loaded from cache (Back button)
    // We force a reset regardless to be 100% sure.
    if (dropdownMenu) {
        dropdownMenu.classList.remove('show');
        menuLinks.forEach(link => {
            link.classList.remove('active-touch');
        });
    }
});