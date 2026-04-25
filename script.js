//elements from the HTML
const audio = document.getElementById('myAudio');
const playBtn = document.getElementById('playBtn');
const progressBar = document.getElementById('progressBar');
const progressContainer = document.querySelector('.progress-container');

//play & pause
playBtn.addEventListener('click', () => {
  if (audio.paused) {
    audio.play();
    playBtn.textContent = '⏸';
  } else {
    audio.pause();
    playBtn.textContent = '▶';
  }
});

//progress bar
audio.addEventListener('timeupdate', () => {
  if (audio.duration) {
    const percentage = (audio.currentTime / audio.duration) * 100;
    progressBar.style.width = percentage + '%';
  }
});

//jump
progressContainer.addEventListener('click', (e) => {
    const width = progressContainer.clientWidth;
    const clickX = e.offsetX;
    const duration = audio.duration;

    
    audio.currentTime = (clickX / width) * duration;
});