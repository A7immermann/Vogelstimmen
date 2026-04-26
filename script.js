// ... (keep your top variables the same)

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
    // Changed to square to stop the "jumping" line-end math
    visualPath.setAttribute("stroke-linecap", "square"); 
    
    svg.appendChild(visualPath);
    visualizerContainer.appendChild(svg);
    drawRestState();
}

function drawRestState() {
    currentY.fill(VIS_HEIGHT - 1);
    visualPath.setAttribute("d", `M 0 ${VIS_HEIGHT - 1} L ${POINT_COUNT} ${VIS_HEIGHT - 1}`);
}

// ... (keep initAudio the same)

function render() {
    if (!audio.paused && !isDragging && audio.duration) {
        progressBar.style.width = (audio.currentTime / audio.duration) * 100 + '%';
    }

    if (analyser && !audio.paused) {
        analyser.getByteFrequencyData(dataArray);
        const bufferLength = dataArray.length;
        let points = [];

        for (let i = 0; i < POINT_COUNT; i++) {
            // 1. ZOOM OUT: Using 0.75 instead of 0.35 to see more "detail" and less "wild" jumps
            const baseIndex = Math.floor((i / POINT_COUNT) * (bufferLength * 0.75));
            
            let val = dataArray[baseIndex];
            let norm = val / 255;
            let threshold = 0.2; // Lowered to catch more subtle chirps
            let targetDisplacement = 0;

            if (norm > threshold) {
                let activeVal = (norm - threshold) / (1 - threshold);
                // Lowered the power to 1.0 to make it less "pointy/wild"
                targetDisplacement = activeVal * (VIS_HEIGHT * 0.8);
            }

            // 2. PIN THE EDGES: Force the first and last few points to stay on the floor
            // This prevents the visual "jump" at the container edges
            if (i < 2 || i > POINT_COUNT - 3) targetDisplacement = 0;

            const targetY = (VIS_HEIGHT - 1) - targetDisplacement;

            // 3. SMOOTHING: Slightly slower "up" movement (0.6) to stop the flickering
            if (targetY < currentY[i]) {
                currentY[i] += (targetY - currentY[i]) * 0.6; 
            } else {
                currentY[i] += (targetY - currentY[i]) * 0.15;
            }

            points.push({ x: i, y: currentY[i] });
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
// ... (rest of the dragging logic stays the same)