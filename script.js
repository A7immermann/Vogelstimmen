const audio = document.getElementById('myAudio');
const playBtn = document.getElementById('playBtn');
const progressBar = document.getElementById('progressBar');
const progressContainer = document.querySelector('.progress-container');

let isDragging = false;
let wasPlayingBeforeDrag = false;

// 1. Play/Pause Toggle
playBtn.addEventListener('click', () => {
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

// 2. Smooth Animation Loop
function smoothUpdate() {
    if (!isDragging && !audio.paused) {
        updateProgressUI();
    }
    // Keep the loop running
    requestAnimationFrame(smoothUpdate);
}

// Start the loop
requestAnimationFrame(smoothUpdate);

function updateProgressUI() {
    if (audio.duration) {
        const percentage = (audio.currentTime / audio.duration) * 100;
        progressBar.style.width = percentage + '%';
    }
}

// 3. Dragging Logic
const handleMove = (e) => {
    const width = progressContainer.clientWidth;
    // Calculate click position relative to the bar
    const rect = progressContainer.getBoundingClientRect();
    const x = e.clientX - rect.left; 
    
    // Calculate percentage (clamped between 0 and 100)
    let percentage = (x / width) * 100;
    percentage = Math.max(0, Math.min(percentage, 100));

    // Update Visuals and Audio Time immediately
    progressBar.style.width = percentage + '%';
    audio.currentTime = (percentage / 100) * audio.duration;
};

progressContainer.addEventListener('mousedown', (e) => {
    isDragging = true;
    wasPlayingBeforeDrag = !audio.paused;
    
    audio.pause(); // Stop playing while dragging
    handleMove(e); // Update position immediately on click
});

window.addEventListener('mousemove', (e) => {
    if (isDragging) {
        handleMove(e);
    }
});

window.addEventListener('mouseup', () => {
    if (isDragging) {
        isDragging = false;
        // If it was playing before we grabbed it, start playing again
        if (wasPlayingBeforeDrag) {
            audio.play();
            playBtn.textContent = '⏸';
        }
    }
});