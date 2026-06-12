//Setup
let video;
let handPose;
let predictions = [];

// Drawing
let prevX = null, prevY = null;
let smoothX = null, smoothY = null;
const SMOOTH = 0.2;

// Kaleidoscope
let symmetry = 6;
let angle;
let artCanvas;

function preload() {
  handPose = ml5.handPose();
}

function gotResults(results) {
  predictions = results;
}

function setup() {
  createCanvas(640, 480);
  angleMode(DEGREES);
  angle = 360 / symmetry;

  // Separate canvas to hold the drawing so video doesn't wipe it
  artCanvas = createGraphics(640, 480);
  artCanvas.angleMode(DEGREES);
  artCanvas.background(0);

  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide();
  handPose.detectStart(video, gotResults);
}

function draw() {
  // Draw video underneath at low opacity so you can still see your hand - *can be changed for users prefered opacity*
  tint(150, 80);
  image(video, 0, 0);
  noTint();

  // Draw the kaleidoscope layer on top of the canvas
  image(artCanvas, 0, 0);

  for (let hand of predictions) {
    if (hand.confidence > 0.95) {

      // Drawing hand keypoints
      for (let kp of hand.keypoints) {
        fill(0, 255, 0);
        noStroke();
        circle(kp.x, kp.y, 10);
      }

      // Index finger tip (keypoint 8)
      const indexTip = hand.keypoints[8];

      // Smooth the position
     if (smoothX === null) {
        smoothX = indexTip.x;
        smoothY = indexTip.y;
      } else {
        smoothX += (indexTip.x - smoothX) * SMOOTH;
        smoothY += (indexTip.y - smoothY) * SMOOTH;
      }

      // Draw kaleidoscope onto the art canvas
      if (prevX !== null) {
        const moved = dist(smoothX, smoothY, prevX, prevY);
        if (moved > 0.5 && moved < 60) {

          // Convert to centre coordinates
          const cx = smoothX - width / 2;
          const cy = smoothY - height / 2;
          const px = prevX - width / 2;
          const py = prevY - height / 2;

          artCanvas.push();
          artCanvas.translate(width / 2, height / 2);

          for (let i = 0; i < symmetry; i++) {
            artCanvas.rotate(angle);
            artCanvas.stroke(255);
            artCanvas.strokeWeight(3);
            artCanvas.strokeCap(ROUND);
            artCanvas.line(cx, cy, px, py);

            // Mirror
            artCanvas.push();
            artCanvas.scale(1, -1);
            artCanvas.line(cx, cy, px, py);
            artCanvas.pop();
          }

          artCanvas.pop();
        }
      }

      prevX = smoothX;
      prevY = smoothY;
    }
  }

  // Reset if no hand detected
  if (predictions.length === 0) {
    prevX = null;
    prevY = null;
    smoothX = null;
    smoothY = null;
  }
}
//Clear the canvas button setup
function keyPressed() {
  if (key === 'c' || key === 'C') {
    artCanvas.background(0);
  }
  // Change symmetry with number keys 2-9
  if (key >= '2' && key <= '9') {
    symmetry = int(key);
    angle = 360 / symmetry;
  }
  //Save button setup
    if (key === 's' || key === 'S') {
    saveCanvas(artCanvas, 'kaleidoscope', 'png');
  }
}