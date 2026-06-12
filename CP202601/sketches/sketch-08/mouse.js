/// Mouse Settings


function mousePressed() {
  let cx = mouseX, cy = mouseY;
  if (nextDropType === 0) dropCircle(cx, cy);
  else if (nextDropType === 1) dropSquare(cx, cy);
  else dropTriangle(cx, cy);
  nextDropType = (nextDropType + 1) % 3;
}

/// Full Screen

function keyPressed() {
  if (key === 'q' || key === 'Q') {
    fullscreen(!fullscreen());
    setTimeout(() => {
      windowResized();
    }, 100);
  }
}