let handPose;
let video;
let hands = [];

// Video is captured at a fixed resolution so ml5 hand-pose has a
// stable input regardless of how big the canvas becomes. Keypoints
// returned by ml5 are in this VIDEO_W × VIDEO_H space and get
// rescaled to canvas space when drawn or used as canvas coordinates.
const VIDEO_W = 640;
const VIDEO_H = 480;

// Low-light pre-processing for ml5. Multipliers only affect what's
// fed to the hand-pose model — the visible scene isn't a video, so
// there's no display side-effect here. Tune on-site:
//   1.0 / 1.0  = no change          (well-lit room)
//   1.4 / 1.2  = mild boost
//   1.6 / 1.3  = good for dim rooms (default)
//   2.0 / 1.5  = very dark rooms
const VIDEO_BRIGHTNESS = 1.6;
const VIDEO_CONTRAST   = 1.3;

let videoBuffer;

let splitX = 0;
let splitY = 0;
let targetX = 0;
let targetY = 0;

let splitRadius = 0;
let targetRadius = 0;

function preload() {
  handPose = ml5.handPose();
}

function setup() {
  createCanvas(windowWidth, windowHeight);

  // Centre the split point on the live canvas
  splitX = targetX = width / 2;
  splitY = targetY = height / 2;

  video = createCapture(VIDEO);
  video.size(VIDEO_W, VIDEO_H);
  video.hide();

  // Pre-processing buffer for ml5 — brightened + contrasted copy
  // of the live video frame, refreshed every draw() tick.
  // pixelDensity(1) is critical — p5.Graphics inherits the global
  // density (2 on Retina), which would double the underlying canvas
  // and double every keypoint coordinate ml5 returns. Forcing 1
  // keeps the buffer at exactly VIDEO_W × VIDEO_H pixels.
  videoBuffer = createGraphics(VIDEO_W, VIDEO_H);
  videoBuffer.pixelDensity(1);

  handPose.detectStart(videoBuffer, gotHands);

  // Preload-blocked, so the ml5 model is ready by now — drop the
  // black-on-black "Loading…" overlay before the first paint.
  document.getElementById('loading-overlay')?.remove();
}

function refreshVideoBuffer() {
  if (!video || !video.width) return;
  videoBuffer.drawingContext.filter =
    `brightness(${VIDEO_BRIGHTNESS}) contrast(${VIDEO_CONTRAST})`;
  videoBuffer.image(video, 0, 0, VIDEO_W, VIDEO_H);
  videoBuffer.drawingContext.filter = "none";
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  background(8, 25, 55);

  refreshVideoBuffer();
  trackHandSpread();
  drawOcean();
  drawFingerDebug();
}

function gotHands(results) {
  hands = results;
}

function trackHandSpread() {
  if (hands.length > 0) {
    let hand = hands[0];

    let thumbTip = mirrorPoint(hand.keypoints[4]);
    let indexTip = mirrorPoint(hand.keypoints[8]);
    let middleTip = mirrorPoint(hand.keypoints[12]);
    let ringTip = mirrorPoint(hand.keypoints[16]);
    let pinkyTip = mirrorPoint(hand.keypoints[20]);

    let tips = [thumbTip, indexTip, middleTip, ringTip, pinkyTip];

    let avgX = 0;
    let avgY = 0;

    for (let tip of tips) {
      avgX += tip.x;
      avgY += tip.y;
    }

    avgX /= tips.length;
    avgY /= tips.length;

    targetX = avgX;
    targetY = avgY;

    let totalDistance = 0;

    for (let tip of tips) {
      totalDistance += dist(tip.x, tip.y, avgX, avgY);
    }

    let fingerSpread = totalDistance / tips.length;

    // Tips are now in canvas-pixel space (mirrorPoint scales from
    // VIDEO_W to width). Scale the original thresholds and output
    // range by the same factor so "open hand" / "closed hand" still
    // map to the same visible split radius proportionally.
    const s = width / VIDEO_W;
    targetRadius = map(fingerSpread, 20 * s, 90 * s, 0, 140 * s);
    targetRadius = constrain(targetRadius, 0, 140 * s);
  } else {
    targetRadius = 0;
  }

  splitX = lerp(splitX, targetX, 0.15);
  splitY = lerp(splitY, targetY, 0.15);
  splitRadius = lerp(splitRadius, targetRadius, 0.12);
}

function drawOcean() {
  let time = frameCount * 0.04;

  for (let y = 0; y < height; y += 10) {
    stroke(80, 180, 255, 190);
    strokeWeight(2);
    noFill();

    beginShape();

    for (let x = 0; x <= width; x += 8) {
      let d = dist(x, y, splitX, splitY);

      if (d < splitRadius) {
        endShape();
        beginShape();
        continue;
      }

      let pushX = 0;
      let pushY = 0;

      // Falloff distance + push force scale with canvas width so the
      // split's "halo" stays proportional to the screen size.
      const s = width / VIDEO_W;
      const falloff = 100 * s;
      const maxForce = 45 * s;

      if (d < splitRadius + falloff && splitRadius > 5) {
        let angle = atan2(y - splitY, x - splitX);
        let force = map(d, splitRadius, splitRadius + falloff, maxForce, 0);
        force = constrain(force, 0, maxForce);

        pushX = cos(angle) * force;
        pushY = sin(angle) * force;
      }

      let wave = sin(x * 0.03 + y * 0.04 + time) * 6;

      vertex(
        x + pushX,
        y + wave + pushY
      );
    }

    endShape();
  }
}

function drawFingerDebug() {
  if (hands.length === 0) return;

  let hand = hands[0];
  let fingertips = [4, 8, 12, 16, 20];

  fill(255);
  noStroke();

  for (let i of fingertips) {
    let p = mirrorPoint(hand.keypoints[i]);
    circle(p.x, p.y, 12);
  }

  noFill();
  stroke(255, 120);
  strokeWeight(2);
  circle(splitX, splitY, splitRadius * 2);
}

// Convert an ml5 keypoint (in VIDEO_W × VIDEO_H space) into a canvas
// coordinate, with horizontal mirror so the on-screen split tracks
// the viewer's hand like a mirror image.
function mirrorPoint(p) {
  return {
    x: width - p.x * (width / VIDEO_W),
    y: p.y * (height / VIDEO_H)
  };
}