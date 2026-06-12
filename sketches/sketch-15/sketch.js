
const COLS    = 70;
const ROWS    = 50;
const SPACING = 8;

// ── PHYSICS 🎛 ────────────────────────────────────────────────
const STIFFNESS      = 0.25;
const DAMPING        = 0.5;
const GRAVITY_STR    = 0.6;
const BREAK_RATIO    = 2;
const BREAK_FRAMES   = 30;
const PIN_THRESHOLD  = 180;   // absolute brightness ceiling — never pin pixels brighter than this
const PIN_PERCENTILE = 0.12;  // share of darkest sampled nodes that become pins (12%)
const PIN_STRENGTH   = 9999;  // effectively unbreakable

// ── INTERACTION 🎛 ────────────────────────────────────────────
const MOUSE_RADIUS   = 100;
const MOUSE_STRENGTH = 10;

// ── VISUAL 🎛 ─────────────────────────────────────────────────
const COOL = [200, 210, 255];
const HOT  = [217,  79,  43];
const BG   = '#0D0D0D';

// ─────────────────────────────────────────────────────────────

let nodes       = [];
let springs     = [];
let gravityOn   = true;
let windOn      = false;
let tornCount   = 0;
let frameCount_ = 0;

// Image state
let uploadedImg    = null;   // p5 image object
let imgPixelData   = null;   // flat brightness array, one per node
let imgLoaded      = false;
let captureBtn     = null;
let showUploadHint = true;

// Webcam state
let capture        = null;   // p5 video capture element
let captureReady   = false;  // metadata loaded, frames available
let pendingSnap    = false;  // user clicked before camera was ready

// ── NODE CLASS ────────────────────────────────────────────────
class Node {
  constructor(x, y, pinned, isImagePin) {
    this.x  = x;
    this.y  = y;
    this.px = x;
    this.py = y;
    this.pinned     = pinned;
    this.isImagePin = isImagePin || false; // pinned by image detection
    this.ax = 0;
    this.ay = 0;
  }

  addForce(fx, fy) {
    if (this.pinned) return;
    this.ax += fx;
    this.ay += fy;
  }

  update() {
    if (this.pinned) return;
    let vx = (this.x - this.px) * DAMPING;
    let vy = (this.y - this.py) * DAMPING;
    this.px = this.x;
    this.py = this.y;
    this.x += vx + this.ax;
    this.y += vy + this.ay + (gravityOn ? GRAVITY_STR : 0);
    this.ax = 0;
    this.ay = 0;
  }
}

// ── SPRING CLASS ──────────────────────────────────────────────
class Spring {
  constructor(a, b) {
    this.a = a;
    this.b = b;
    this.restLen      = dist(a.x, a.y, b.x, b.y);
    this.broken       = false;
    this.stretchRatio = 1;
    this.overCount    = 0;
    // If either node is an image pin, spring is much harder to break
    this.breakRatio   = (a.isImagePin || b.isImagePin)
                          ? BREAK_RATIO * PIN_STRENGTH
                          : BREAK_RATIO;
  }

  update() {
    if (this.broken) return;

    let dx  = this.b.x - this.a.x;
    let dy  = this.b.y - this.a.y;
    let cur = sqrt(dx * dx + dy * dy);
    if (cur < 0.001) return;

    this.stretchRatio = cur / this.restLen;

    if (this.stretchRatio > this.breakRatio) {
      this.overCount++;
      if (this.overCount >= BREAK_FRAMES) {
        this.broken = true;
        tornCount++;
        return;
      }
    } else {
      this.overCount = max(0, this.overCount - 2);
    }

    let force = (cur - this.restLen) * STIFFNESS;
    let nx    = (dx / cur) * force;
    let ny    = (dy / cur) * force;

    this.a.addForce( nx,  ny);
    this.b.addForce(-nx, -ny);
  }

  draw() {
    if (this.broken) return;

    // Use PIN_STRENGTH-aware ratio for colour mapping
    let displayBreak = (this.a.isImagePin || this.b.isImagePin)
                         ? BREAK_RATIO
                         : this.breakRatio;
    let t  = constrain(
      map(this.stretchRatio, 1.0, displayBreak, 0, 1),
      0, 1
    );

    let r  = lerp(COOL[0], HOT[0], t);
    let g  = lerp(COOL[1], HOT[1], t);
    let b  = lerp(COOL[2], HOT[2], t);
    let al = lerp(140, 240, t);
    let sw = lerp(0.6, 2.5, t);

    stroke(r, g, b, al);
    strokeWeight(sw);
    line(this.a.x, this.a.y, this.b.x, this.b.y);
  }
}

// ── IMAGE SAMPLING ────────────────────────────────────────────
// Called after image loads OR after membrane rebuilds with image
function sampleImagePins() {
  if (!uploadedImg) return;

  // Work out where the grid starts (same as buildMembrane)
  let totalW = (COLS - 1) * SPACING;
  let totalH = (ROWS - 1) * SPACING;
  let sx     = (width  - totalW) / 2;
  let sy     = (height - totalH) / 2 - 20;

  // Scale image to fit the grid bounds
  let gridW = totalW;
  let gridH = totalH;

  uploadedImg.loadPixels();

  imgPixelData = [];

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      // Map node position into image space
      let nodeX = sx + c * SPACING;
      let nodeY = sy + r * SPACING;

      // Normalise to 0–1 within grid
      let u = c / (COLS - 1);
      let v = r / (ROWS - 1);

      // Sample pixel in image
      let px = floor(u * (uploadedImg.width  - 1));
      let py = floor(v * (uploadedImg.height - 1));

      let idx        = (py * uploadedImg.width + px) * 4;
      let rVal       = uploadedImg.pixels[idx];
      let gVal       = uploadedImg.pixels[idx + 1];
      let bVal       = uploadedImg.pixels[idx + 2];
      let aVal       = uploadedImg.pixels[idx + 3]; // alpha

      // Perceived brightness
      let brightness = 0.299 * rVal + 0.587 * gVal + 0.114 * bVal;

      // Treat transparent pixels as white (background)
      if (aVal < 128) brightness = 255;

      imgPixelData.push(brightness);
    }
  }
}

// Apply pin data to already-built node grid.
//
// Pinning is adaptive: we sort the sampled brightness values and
// take the value at the PIN_PERCENTILE position as the cut-off, so
// only the darkest ~12% of nodes get pinned regardless of how dim
// or bright the captured scene is. PIN_THRESHOLD acts as an
// absolute ceiling — if even the darkest band is fairly bright
// (e.g. the camera sees a uniform pale wall), we don't manufacture
// pins from noise.
//
// Why this matters: a webcam frame is dominated by midtones, so
// the original fixed-threshold approach (intended for clean
// black-on-white logos) pinned the majority of nodes and froze the
// whole mesh. Going relative-percentile fixes that for any
// lighting condition.
function applyImagePins() {
  if (!imgPixelData) return;

  const sorted = imgPixelData.slice().sort((a, b) => a - b);
  const cutoffIdx = Math.floor(sorted.length * PIN_PERCENTILE);
  const dynamicThreshold = Math.min(sorted[cutoffIdx], PIN_THRESHOLD);

  let i = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      let n          = nodes[r][c];
      let brightness = imgPixelData[i++];
      let isDark     = brightness < dynamicThreshold;

      if (isDark && !n.pinned) {
        // Pin this node — lock it in place
        n.isImagePin = true;
        n.pinned     = true;
      }
    }
  }

  // Update spring break ratios now that pins have changed
  for (let s of springs) {
    s.breakRatio = (s.a.isImagePin || s.b.isImagePin)
                     ? BREAK_RATIO * PIN_STRENGTH
                     : BREAK_RATIO;
  }
}

// ── BUILD GRID ────────────────────────────────────────────────
function buildMembrane() {
  nodes     = [];
  springs   = [];
  tornCount = 0;

  let totalW = (COLS - 1) * SPACING;
  let totalH = (ROWS - 1) * SPACING;
  let sx     = (width  - totalW) / 2;
  let sy     = (height - totalH) / 2 - 20;

  for (let r = 0; r < ROWS; r++) {
    nodes[r] = [];
    for (let c = 0; c < COLS; c++) {
      let topPin = (r === 0);
      nodes[r][c] = new Node(
        sx + c * SPACING,
        sy + r * SPACING,
        topPin, false
      );
    }
  }

  // Horizontal springs
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS - 1; c++)
      springs.push(new Spring(nodes[r][c], nodes[r][c + 1]));

  // Vertical springs
  for (let r = 0; r < ROWS - 1; r++)
    for (let c = 0; c < COLS; c++)
      springs.push(new Spring(nodes[r][c], nodes[r + 1][c]));

  // Diagonal shear springs
  for (let r = 0; r < ROWS - 1; r++) {
    for (let c = 0; c < COLS - 1; c++) {
      springs.push(new Spring(nodes[r][c],     nodes[r + 1][c + 1]));
      springs.push(new Spring(nodes[r][c + 1], nodes[r + 1][c]));
    }
  }

  // If image already loaded, re-apply pins
  if (imgLoaded && imgPixelData) {
    applyImagePins();
  }
}

// ── SETUP ─────────────────────────────────────────────────────
function setup() {
  createCanvas(windowWidth, windowHeight);
  buildMembrane();
  createCaptureUI();
}

// ── CAPTURE UI (HTML overlay) ──────────────────────────────────
function createCaptureUI() {
  // Styled capture button
  captureBtn = createButton('CAPTURE FROM CAMERA');
  captureBtn.position(width / 2 - 92, height - 52);
  captureBtn.style('background',    'transparent');
  captureBtn.style('border',        '1px solid #D94F2B');
  captureBtn.style('color',         '#D94F2B');
  captureBtn.style('font-family',   'monospace');
  captureBtn.style('font-size',     '10px');
  captureBtn.style('letter-spacing','0.15em');
  captureBtn.style('padding',       '8px 18px');
  captureBtn.style('cursor',        'pointer');
  captureBtn.style('transition',    'all 0.2s');
  captureBtn.mouseOver(() => {
    captureBtn.style('background', '#D94F2B');
    captureBtn.style('color',      '#0D0D0D');
  });
  captureBtn.mouseOut(() => {
    captureBtn.style('background', 'transparent');
    captureBtn.style('color',      '#D94F2B');
  });
  captureBtn.mousePressed(triggerCapture);
}

// ── WEBCAM HELPERS ─────────────────────────────────────────────
// Lazily start the webcam on first click so the permission prompt
// is tied to a user gesture (and isn't asked for until needed).
function ensureCapture() {
  if (capture) return;
  capture = createCapture(VIDEO, () => {
    captureReady = true;
    if (pendingSnap) {
      pendingSnap = false;
      snapWebcamFrame();
    }
  });
  capture.hide();
}

function triggerCapture() {
  ensureCapture();
  if (captureReady) {
    snapWebcamFrame();
  } else {
    // Camera is still spinning up — snap as soon as it's ready
    pendingSnap = true;
    captureBtn.html('STARTING CAMERA…');
  }
}

// Grab the current webcam frame, mirror it (selfie-style),
// and feed it into the existing image-pin pipeline.
function snapWebcamFrame() {
  if (!capture || !capture.width || !capture.height) return;

  const w = capture.width;
  const h = capture.height;
  const g = createGraphics(w, h);
  // Mirror horizontally so the captured image matches what the
  // viewer sees of themselves on screen.
  g.push();
  g.translate(w, 0);
  g.scale(-1, 1);
  g.image(capture, 0, 0, w, h);
  g.pop();

  uploadedImg    = g.get();
  imgLoaded      = true;
  showUploadHint = false;

  sampleImagePins();
  buildMembrane();

  // Always show 'CAPTURE FROM CAMERA' so the affordance is unambiguous
  captureBtn.html('CAPTURE FROM CAMERA');
  captureBtn.position(width / 2 - 92, height - 52);
}

// ── DRAW ──────────────────────────────────────────────────────
function draw() {
  background(BG);
  frameCount_++;

  if (windOn) applyWind();
  if (mouseIsPressed) applyMouseForce();

  for (let s of springs) s.update();
  for (let r of nodes) for (let n of r) n.update();

  noFill();
  for (let s of springs) s.draw();

  // Draw nodes
  noStroke();
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      let n = nodes[r][c];
      if (n.isImagePin) {
        // Image-pinned nodes: bright red, slightly bigger
        fill(217, 79, 43, 220);
        circle(n.x, n.y, 6);
      } else if (n.pinned) {
        // Top row pins: dim red
        fill(217, 79, 43, 120);
        circle(n.x, n.y, 4);
      }
      // Free nodes: invisible unless you uncomment:
      // else { fill(80, 80, 80, 80); circle(n.x, n.y, 3); }
    }
  }

  drawHUD();

  // Upload hint when no image loaded
  if (showUploadHint) drawUploadHint();
}

// ── UPLOAD HINT ───────────────────────────────────────────────
function drawUploadHint() {
  noStroke();
  fill(200, 210, 255, 40);
  textAlign(CENTER, CENTER);
  textFont('monospace');
  textSize(11);
  text(
    'Capture a frame from your webcam to pin its dark shapes into the grid.\nHigh-contrast subjects against a bright background work best.',
    width / 2, height - 80
  );
}

// ── MOUSE FORCE ───────────────────────────────────────────────
function applyMouseForce() {
  for (let r of nodes) {
    for (let n of r) {
      if (n.pinned) continue;
      let d = dist(mouseX, mouseY, n.x, n.y);
      if (d < MOUSE_RADIUS && d > 0.01) {
        let strength = map(d, 0, MOUSE_RADIUS, MOUSE_STRENGTH, 0);
        let angle    = atan2(mouseY - n.y, mouseX - n.x);
        n.addForce(cos(angle) * strength, sin(angle) * strength);
      }
    }
  }
}

// ── WIND ──────────────────────────────────────────────────────
function applyWind() {
  let t = frameCount_ * 0.015;
  for (let r = 1; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      let n = nodes[r][c];
      if (!n.pinned) {
        let w = sin(t + r * 0.3 + c * 0.2) * 0.12;
        n.addForce(w, 0);
      }
    }
  }
}

// ── HUD ───────────────────────────────────────────────────────
function drawHUD() {
  let total = springs.length;
  let alive = springs.filter(s => !s.broken).length;
  let pins  = 0;
  for (let r of nodes) for (let n of r) if (n.isImagePin) pins++;

  noStroke();
  textFont('monospace');

  // Bottom left — stats
  fill(200, 210, 255, 80);
  textSize(10);
  textAlign(LEFT, BOTTOM);
  text('SPRINGS  ' + alive + ' / ' + total, 20, height - 56);
  text('TORN     ' + tornCount,              20, height - 42);
  if (pins > 0) {
    fill(217, 79, 43, 140);
    text('IMAGE PINS  ' + pins,              20, height - 28);
  }

  // Bottom right — controls
  fill(200, 210, 255, 60);
  textSize(10);
  textAlign(RIGHT, BOTTOM);
  text('[R] reset  [G] gravity  [W] wind  [C] capture', width - 20, height - 56);

  // Top left — title
  textAlign(LEFT, TOP);
  fill(217, 79, 43, 180);
  textSize(9);
  text('ARCH1477', 20, 20);
  fill(244, 241, 236, 200);
  textSize(18);
  text('MEMBRANE', 20, 32);

  // Top right — toggles
  textAlign(RIGHT, TOP);
  textSize(9);
  fill(gravityOn ? color(217, 79, 43, 180) : color(80, 80, 80));
  text('GRAVITY ' + (gravityOn ? 'ON' : 'OFF'), width - 20, 20);
  fill(windOn ? color(217, 79, 43, 180) : color(80, 80, 80));
  text('WIND ' + (windOn ? 'ON' : 'OFF'), width - 20, 32);
  if (imgLoaded) {
    fill(217, 79, 43, 120);
    text('IMAGE LOADED', width - 20, 44);
  }
}

// ── KEY CONTROLS ──────────────────────────────────────────────
function keyPressed() {
  if (key === 'r' || key === 'R') buildMembrane();
  if (key === 'g' || key === 'G') gravityOn = !gravityOn;
  if (key === 'w' || key === 'W') windOn    = !windOn;
  if (key === 'c' || key === 'C') triggerCapture();
}

// ── RESIZE ────────────────────────────────────────────────────
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  // Re-centre the capture button based on its current label width
  const approxWidth = (captureBtn.html() || '').length * 7;
  captureBtn.position(width / 2 - approxWidth / 2, height - 52);
  buildMembrane();
}