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

// Video capture stays at a fixed resolution for stable ml5 hand
// tracking; ml5 keypoints come back in this space and get rescaled
// to the (full-frame) canvas when drawn or used as coordinates.
const VIDEO_W = 640;
const VIDEO_H = 480;

// Touchscreen UI
let clearBtn = null;
let symmetryBtns = [];

function preload() {
  handPose = ml5.handPose();
}

function gotResults(results) {
  predictions = results;
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  angleMode(DEGREES);
  angle = 360 / symmetry;

  // Separate canvas to hold the drawing so video doesn't wipe it.
  // Matches the live canvas dimensions so kaleidoscope strokes fill
  // the viewport rather than getting stretched up from 640×480.
  artCanvas = createGraphics(width, height);
  artCanvas.angleMode(DEGREES);
  artCanvas.background(0);

  video = createCapture(VIDEO);
  video.size(VIDEO_W, VIDEO_H);
  video.hide();
  handPose.detectStart(video, gotResults);

  createTouchUI();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);

  // Preserve the existing kaleidoscope across the resize: snapshot
  // the old artCanvas, rebuild it at the new size, then stretch the
  // snapshot back in. This way a fullscreen toggle doesn't wipe the
  // visitor's work mid-interaction.
  const snapshot = createGraphics(artCanvas.width, artCanvas.height);
  snapshot.image(artCanvas, 0, 0);

  artCanvas = createGraphics(width, height);
  artCanvas.angleMode(DEGREES);
  artCanvas.background(0);
  artCanvas.image(snapshot, 0, 0, width, height);

  snapshot.remove();

  positionTouchUI();
}

// ── TOUCHSCREEN UI ────────────────────────────────────────────
// Builds a CLEAR button + symmetry chips (2–9) in a single row
// centred along the bottom of the canvas so visitors can do the
// keyboard actions by touch. Layout is recomputed on resize so the
// row stays at the bottom edge in fullscreen too.
function createTouchUI() {
  styleControl(clearBtn = createButton("CLEAR"), "wide");
  clearBtn.mouseOver(() => activeStyle(clearBtn));
  clearBtn.mouseOut(() => idleStyle(clearBtn));
  clearBtn.mousePressed(clearArt);

  for (let n = 2; n <= 9; n++) {
    const b = createButton(String(n));
    styleControl(b, "chip");
    b.mousePressed(() => setSymmetry(n));
    symmetryBtns.push({ n, btn: b });
  }

  positionTouchUI();
  updateSymmetryHighlight();
}

// Shared visual language for all bottom-row controls
function styleControl(b, kind) {
  idleStyle(b);
  b.style("border",         "1px solid rgba(255,255,255,0.6)");
  b.style("font-family",    "monospace");
  b.style("letter-spacing", "0.1em");
  b.style("cursor",         "pointer");
  b.style("transition",     "background 0.15s ease, color 0.15s ease");
  if (kind === "chip") {
    b.style("width",     "42px");
    b.style("padding",   "8px 0");
    b.style("font-size", "13px");
    b.style("text-align","center");
  } else {
    b.style("padding",   "8px 16px");
    b.style("font-size", "11px");
  }
}

function idleStyle(b) {
  b.style("background", "rgba(0,0,0,0.55)");
  b.style("color",      "#fff");
}

function activeStyle(b) {
  b.style("background", "rgba(255,255,255,0.85)");
  b.style("color",      "#000");
}

// Centre [CLEAR] [2] [3] … [9] at the bottom of the canvas.
function positionTouchUI() {
  if (!clearBtn) return;

  const chipW   = 42;
  const chipGap = 8;
  const clearW  = 90; // approximate rendered width of CLEAR button
  const clearGap = 22; // breathing room between CLEAR and the chips

  const chipsW  = symmetryBtns.length * chipW + (symmetryBtns.length - 1) * chipGap;
  const totalW  = clearW + clearGap + chipsW;
  const startX  = (width - totalW) / 2;
  const y       = height - 60;

  clearBtn.position(startX, y);

  const chipsStart = startX + clearW + clearGap;
  symmetryBtns.forEach(({ btn }, i) => {
    btn.position(chipsStart + i * (chipW + chipGap), y);
  });
}

function clearArt() {
  artCanvas.background(0);
}

function setSymmetry(n) {
  symmetry = n;
  angle = 360 / symmetry;
  updateSymmetryHighlight();
}

function updateSymmetryHighlight() {
  for (const { n, btn } of symmetryBtns) {
    if (n === symmetry) activeStyle(btn);
    else                idleStyle(btn);
  }
}

function draw() {
  // Scale keypoints from VIDEO_W/H into canvas (window) space.
  // Pre-compute once per frame so the draw and UI loops use the
  // same numbers.
  const sx = width  / VIDEO_W;
  const sy = height / VIDEO_H;

  // Draw video underneath at low opacity, stretched to fill the
  // viewport so it acts as a full-frame backdrop.
  tint(150, 80);
  image(video, 0, 0, width, height);
  noTint();

  // Draw the kaleidoscope layer on top of the canvas
  image(artCanvas, 0, 0);

  for (let hand of predictions) {
    if (hand.confidence > 0.95) {

      // Drawing hand keypoints (scaled to canvas space)
      for (let kp of hand.keypoints) {
        fill(0, 255, 0);
        noStroke();
        circle(kp.x * sx, kp.y * sy, 10);
      }

      // Index finger tip (keypoint 8) — scale into canvas space
      // BEFORE smoothing so prevX / smoothX live in the same space
      // as the kaleidoscope coordinates.
      const indexTip = hand.keypoints[8];
      const tipX = indexTip.x * sx;
      const tipY = indexTip.y * sy;

      // Smooth the position
     if (smoothX === null) {
        smoothX = tipX;
        smoothY = tipY;
      } else {
        smoothX += (tipX - smoothX) * SMOOTH;
        smoothY += (tipY - smoothY) * SMOOTH;
      }

      // Draw kaleidoscope onto the art canvas.
      // Movement thresholds scale with the canvas so the "skip if
      // the hand teleported" gate doesn't reject normal movements
      // on a much larger viewport.
      if (prevX !== null) {
        const moved = dist(smoothX, smoothY, prevX, prevY);
        const minMove = 0.5 * sx;
        const maxMove = 60  * sx;
        if (moved > minMove && moved < maxMove) {

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
// Keyboard shortcuts — kept as a desktop / dev convenience; the
// touchscreen kiosk uses the on-screen CLEAR button and symmetry
// chips created in setup.
function keyPressed() {
  if (key === 'c' || key === 'C') clearArt();

  // Change symmetry with number keys 2–9
  if (key >= '2' && key <= '9') setSymmetry(int(key));

  // Save PNG — desktop only, no on-screen equivalent for visitors
  if (key === 's' || key === 'S') {
    saveCanvas(artCanvas, 'kaleidoscope', 'png');
  }
}