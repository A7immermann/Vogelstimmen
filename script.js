const audio = document.getElementById('myAudio');
const playBtn = document.getElementById('playBtn');
const progressBar = document.getElementById('progressBar');
const progressContainer = document.querySelector('.progress-container');

let isDragging = false;
let wasPlayingBeforeDrag = false;

// 1. Play/Pause Toggle
playBtn.addEventListener('click', togglePlay);

function togglePlay() {
    if (audio.paused) {
        audio.play();
        playBtn.textContent = '⏸';
    } else {
        audio.pause();
        playBtn.textContent = '▶';
    }
}

// 2. High-Framerate Render Loop (The "Liquid" Engine)
function render() {
    // This runs ~60 times per second
    if (!audio.paused && !isDragging && audio.duration) {
        const percentage = (audio.currentTime / audio.duration) * 100;
        progressBar.style.width = percentage + '%';
    }
    requestAnimationFrame(render);
}

// Kick off the loop immediately
requestAnimationFrame(render);

// 3. Dragging Logic
const handleMove = (e) => {
    const rect = progressContainer.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = progressContainer.clientWidth;
    
    let percentage = (x / width) * 100;
    percentage = Math.max(0, Math.min(percentage, 100));

    // Update bar visually for instant feedback
    progressBar.style.width = percentage + '%';
    
    // Update audio position
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
        if (wasPlayingBeforeDrag) {
            audio.play();
            playBtn.textContent = '⏸';
        }
    }
});