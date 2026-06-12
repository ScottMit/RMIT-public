let handPose;
let video;
let hands = [];

let splitX = 320;
let splitY = 240;
let targetX = 320;
let targetY = 240;

let splitRadius = 0;
let targetRadius = 0;

function preload() {
  handPose = ml5.handPose();
}

function setup() {
  createCanvas(640, 480);

  video = createCapture(VIDEO);
  video.size(width, height);
  video.hide();

  handPose.detectStart(video, gotHands);
}

function draw() {
  background(8, 25, 55);

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

    targetRadius = map(fingerSpread, 20, 90, 0, 140);
    targetRadius = constrain(targetRadius, 0, 140);
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

      if (d < splitRadius + 100 && splitRadius > 5) {
        let angle = atan2(y - splitY, x - splitX);
        let force = map(d, splitRadius, splitRadius + 100, 45, 0);
        force = constrain(force, 0, 45);

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

function mirrorPoint(p) {
  return {
    x: width - p.x,
    y: p.y
  };
}