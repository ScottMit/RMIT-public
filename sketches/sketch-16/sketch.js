let mic, fft;
let video;
let faceMesh;
let faces = [];

let particles = [];

let ampSmooth = 0;
let freqSmooth = 0;

let modeX = 4;
let modeY = 7;
let targetModeX = 4;
let targetModeY = 7;

let currentEmotion = "neutral";

let sharpness = 0.9;
let glowAmount = 0.75;
let particleSpeed = 1.0;
let hueValue = 200;

let droopAmount = 0;
let calmAmount = 1;
let jaggedAmount = 0;
let expansionAmount = 1;

let smileSmooth = 0;
let mouthOpenSmooth = 0;
let faceMovementSmooth = 0;

let lastNoseX = 0;
let lastNoseY = 0;

let calibrated = false;
let neutralSmile = 1.0;
let neutralMouth = 0.3;
let neutralMovement = 0;

let manualEmotion = null;

let emotionColour;

let calibrateBtn = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  colorMode(HSB, 360, 100, 100, 255);
  background(0);

  mic = new p5.AudioIn();
  mic.start();

  fft = new p5.FFT(0.78, 1024);
  fft.setInput(mic);

  setupFaceTracking();

  createParticles();
  createCalibrateButton();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  // Camera preview is anchored to the top-left, so the button keeps
  // its absolute position — no repositioning needed on resize.
}

// ── CALIBRATION ──────────────────────────────────────────────────
// Snap the current smile / mouth / movement values as the viewer's
// "neutral" baseline. Used by both the on-screen button (touch) and
// the C key (kept for desktop / dev convenience).
function calibrate() {
  neutralSmile = smileSmooth;
  neutralMouth = mouthOpenSmooth;
  neutralMovement = faceMovementSmooth;
  calibrated = true;
  if (calibrateBtn) calibrateBtn.html("CALIBRATED · TAP AGAIN");
  console.log("Calibrated neutral face");
}

function createCalibrateButton() {
  // Camera preview lives at (20, 20) at 240×180; this button sits
  // just below the stats lines inside that preview panel.
  const camW = 240;
  const camH = 180;

  calibrateBtn = createButton("TAP TO CALIBRATE FACE");
  calibrateBtn.position(30, 20 + camH + 100);
  calibrateBtn.style("width",          camW - 20 + "px");
  calibrateBtn.style("background",     "transparent");
  calibrateBtn.style("border",         "1px solid rgba(255,255,255,0.6)");
  calibrateBtn.style("color",          "#fff");
  calibrateBtn.style("font-family",    "monospace");
  calibrateBtn.style("font-size",      "11px");
  calibrateBtn.style("letter-spacing", "0.12em");
  calibrateBtn.style("padding",        "8px 10px");
  calibrateBtn.style("cursor",         "pointer");
  calibrateBtn.style("transition",     "background 0.15s ease, color 0.15s ease");
  calibrateBtn.mouseOver(() => {
    calibrateBtn.style("background", "rgba(255,255,255,0.85)");
    calibrateBtn.style("color",      "#000");
  });
  calibrateBtn.mouseOut(() => {
    calibrateBtn.style("background", "transparent");
    calibrateBtn.style("color",      "#fff");
  });
  calibrateBtn.mousePressed(calibrate);
}
function setupFaceTracking() {
  video = createCapture(VIDEO, () => {
    video.size(320, 240);
    video.hide();

    faceMesh = ml5.faceMesh(() => {
      console.log("FaceMesh loaded");

      faceMesh.detectStart(video, gotFaces);

      // Model is now actually ready — drop the "Loading…" overlay.
      // This sketch loads faceMesh asynchronously inside setup()
      // (not preload), so the model isn't ready at end of setup;
      // we have to wait for this callback before hiding the overlay.
      document.getElementById('loading-overlay')?.remove();
    });
  });
}

function draw() {
  background(0, 42);

  fft.analyze();

  ampSmooth = lerp(ampSmooth, mic.getLevel(), 0.18);
  freqSmooth = lerp(freqSmooth, fft.getCentroid(), 0.12);

  let activity = map(ampSmooth, 0.004, 0.08, 0, 1, true);

  updateModesFromFrequency(freqSmooth);
  updateFaceMood();
  updateEmotionMateriality();

  modeX = lerp(modeX, targetModeX, 0.08);
  modeY = lerp(modeY, targetModeY, 0.08);

  translate(width / 2, height / 2);

  updateParticles(activity);
  drawParticles(activity);
  drawInfo();
  drawCameraPreview();
}

function drawCameraPreview() {
  push();

  resetMatrix();

  let camW = 240;
  let camH = 180;

  fill(0, 180);
  noStroke();
  rect(20, 20, camW, camH + 70, 12);

  image(video, 20, 20, camW, camH);

  fill(255);
  textSize(18);
  textAlign(LEFT, TOP);

  text("Emotion: " + currentEmotion, 30, camH + 35);

  textSize(14);

  text("Smile: " + nf(smileSmooth, 1, 2), 30, camH + 60);

  text("Mouth: " + nf(mouthOpenSmooth, 1, 2), 30, camH + 80);

  // The on-screen "TAP TO CALIBRATE FACE" button (created in setup)
  // sits where the old keyboard prompt used to be drawn.

  pop();
}

function createParticles() {
  particles = [];

  let count = 18000;
  let maxR = min(width, height) * 0.42;

  for (let i = 0; i < count; i++) {
    let a = random(TWO_PI);
    let r = sqrt(random()) * maxR;

    particles.push({
      angle: a,
      radius: r,
      baseRadius: r,
      targetAngle: a,
      targetRadius: r,
      x: cos(a) * r,
      y: sin(a) * r,
      vx: 0,
      vy: 0,
      size: random(0.35, 1.15),
      layer: random([0, 1, 2, 3]),
      offset: random(1000)
    });
  }
}

function gotFaces(results) {
  faces = results;
}

function updateModesFromFrequency(freq) {
  if (freq < 500) {
    targetModeX = 3;
    targetModeY = 5;
  } else if (freq < 900) {
    targetModeX = 4;
    targetModeY = 6;
  } else if (freq < 1400) {
    targetModeX = 5;
    targetModeY = 8;
  } else if (freq < 2200) {
    targetModeX = 7;
    targetModeY = 9;
  } else if (freq < 3200) {
    targetModeX = 8;
    targetModeY = 12;
  } else {
    targetModeX = 11;
    targetModeY = 15;
  }
}

function updateFaceMood() {

  if (faces.length === 0) {
    currentEmotion = "neutral";
    return;
  }

  let keypoints = faces[0].keypoints;

  if (!keypoints || keypoints.length < 300) {
    currentEmotion = "neutral";
    return;
  }

  let leftMouth = keypoints[61];
  let rightMouth = keypoints[291];
  let topLip = keypoints[13];
  let bottomLip = keypoints[14];
  let nose = keypoints[1];

  if (
    !leftMouth ||
    !rightMouth ||
    !topLip ||
    !bottomLip ||
    !nose
  ) {
    currentEmotion = "neutral";
    return;
  }

  let mouthWidth =
    dist(
      leftMouth.x,
      leftMouth.y,
      rightMouth.x,
      rightMouth.y
    );

  let mouthOpen =
    dist(
      topLip.x,
      topLip.y,
      bottomLip.x,
      bottomLip.y
    );

  let smileRatio = mouthWidth / 80;
  let openRatio = mouthOpen / 25;

  smileSmooth =
    lerp(
      smileSmooth,
      smileRatio,
      0.08
    );

  mouthOpenSmooth =
    lerp(
      mouthOpenSmooth,
      openRatio,
      0.08
    );

  let movement =
    dist(
      nose.x,
      nose.y,
      lastNoseX,
      lastNoseY
    );

  faceMovementSmooth =
    lerp(
      faceMovementSmooth,
      movement,
      0.08
    );

  lastNoseX = nose.x;
  lastNoseY = nose.y;


  if (!calibrated) {
    currentEmotion = "neutral";
    return;
  }

  let smileDiff =
    smileSmooth - neutralSmile;

  let mouthDiff =
    mouthOpenSmooth - neutralMouth;


  if (manualEmotion !== null) {
    currentEmotion = manualEmotion;
    return;
  }


  if (mouthDiff > 0.45) {

    currentEmotion = "surprised";

  } else if (smileDiff > 0.18) {

    currentEmotion = "happy";

  } else if (
    faceMovementSmooth >
    neutralMovement + 5.5
  ) {

    currentEmotion = "fearful";

  } else if (
    smileDiff < -0.28 &&
    mouthDiff < 0.15
  ) {

    currentEmotion = "sad";

  } else {

    currentEmotion = "neutral";

  }
}

function updateEmotionMateriality() {
  if (currentEmotion === "sad") {
    sharpness = lerp(sharpness, 0.45, 0.05);
    glowAmount = lerp(glowAmount, 0.45, 0.05);
    particleSpeed = lerp(particleSpeed, 0.45, 0.05);
    hueValue = lerp(hueValue, 230, 0.05);

    droopAmount = lerp(droopAmount, 1.0, 0.05);
    calmAmount = lerp(calmAmount, 0.4, 0.05);
    jaggedAmount = lerp(jaggedAmount, 0.0, 0.05);
    expansionAmount = lerp(expansionAmount, 0.85, 0.05);
  } 
  
  else if (currentEmotion === "neutral") {
    sharpness = lerp(sharpness, 0.65, 0.05);
    glowAmount = lerp(glowAmount, 0.8, 0.05);
    particleSpeed = lerp(particleSpeed, 0.75, 0.05);
    hueValue = lerp(hueValue, 200, 0.05);

    droopAmount = lerp(droopAmount, 0.0, 0.05);
    calmAmount = lerp(calmAmount, 1.0, 0.05);
    jaggedAmount = lerp(jaggedAmount, 0.0, 0.05);
    expansionAmount = lerp(expansionAmount, 1.0, 0.05);
  } 
  
  else if (currentEmotion === "happy") {
    sharpness = lerp(sharpness, 0.55, 0.05);
    glowAmount = lerp(glowAmount, 1.25, 0.05);
    particleSpeed = lerp(particleSpeed, 1.15, 0.05);
    hueValue = lerp(hueValue, 45, 0.05);

    droopAmount = lerp(droopAmount, 0.0, 0.05);
    calmAmount = lerp(calmAmount, 0.75, 0.05);
    jaggedAmount = lerp(jaggedAmount, 0.0, 0.05);
    expansionAmount = lerp(expansionAmount, 1.15, 0.05);
  } 
  
  else if (currentEmotion === "surprised") {
    sharpness = lerp(sharpness, 1.1, 0.05);
    glowAmount = lerp(glowAmount, 1.45, 0.05);
    particleSpeed = lerp(particleSpeed, 1.5, 0.05);
    hueValue = lerp(hueValue, 300, 0.05);

    droopAmount = lerp(droopAmount, 0.0, 0.05);
    calmAmount = lerp(calmAmount, 0.45, 0.05);
    jaggedAmount = lerp(jaggedAmount, 0.25, 0.05);
    expansionAmount = lerp(expansionAmount, 1.3, 0.05);
  } 
  
  else if (currentEmotion === "fearful") {
    sharpness = lerp(sharpness, 1.35, 0.05);
    glowAmount = lerp(glowAmount, 0.85, 0.05);
    particleSpeed = lerp(particleSpeed, 1.35, 0.05);
    hueValue = lerp(hueValue, 275, 0.05);

    droopAmount = lerp(droopAmount, 0.0, 0.05);
    calmAmount = lerp(calmAmount, 0.25, 0.05);
    jaggedAmount = lerp(jaggedAmount, 0.65, 0.05);
    expansionAmount = lerp(expansionAmount, 1.05, 0.05);
  }
}

function updateParticles(activity) {
  let maxR = min(width, height) * 0.43;

  let dominant = int(map(freqSmooth, 200, 4200, 6, 18, true));
  let petals = dominant + int(map(modeX, 3, 11, 0, 5));

  let layerSpacing = maxR / 7;
  let formationSpeed = map(activity, 0, 1, 0.08, 0.32) * particleSpeed;

  for (let p of particles) {
    let ringIndex = floor(map(p.baseRadius, 0, maxR, 1, 7, true));
    let ringR = ringIndex * layerSpacing;

    let petalWave =
      sin(p.angle * petals) *
      map(activity, 0, 1, 35, 110);

    let secondaryWave =
      sin(p.angle * petals * 0.5 + ringIndex * PI) *
      map(activity, 0, 1, 20, 70);

    let ripple =
      sin(p.baseRadius * 0.045 - frameCount * 0.015 * activity) *
      map(activity, 0, 1, 6, 35);

    let sharpNode =
      pow(abs(sin(p.angle * petals)), map(sharpness, 0.4, 1.8, 1.8, 0.45, true));

    let nodePull =
      sharpNode *
      map(activity, 0, 1, 25, 125);

    p.targetRadius =
      ringR +
      petalWave * 0.45 +
      secondaryWave * 0.35 +
      ripple +
      nodePull * 0.55;

    p.targetRadius = constrain(p.targetRadius, 20, maxR);

    let angularLock =
      round((p.angle / TWO_PI) * petals) / petals * TWO_PI;

    p.targetAngle = lerp(
      p.angle,
      angularLock,
      activity * 0.08 * sharpness
    );

    let shapedRadius = p.targetRadius * expansionAmount;

let tx = cos(p.targetAngle) * shapedRadius;
let ty = sin(p.targetAngle) * shapedRadius;


ty += droopAmount * map(p.baseRadius, 0, maxR, 10, 95);

// sad = slightly stretched downward
ty *= map(droopAmount, 0, 1, 1.0, 1.22);
tx *= map(droopAmount, 0, 1, 1.0, 0.88);


let jag =
  sin(p.angle * petals * 2.5 + p.offset) *
  jaggedAmount *
  45;

tx += cos(p.angle) * jag;
ty += sin(p.angle) * jag;


let smoothness = map(calmAmount, 0, 1, formationSpeed, formationSpeed * 0.55);

    p.x = lerp(p.x, tx, smoothness);
    p.y = lerp(p.y, ty, smoothness);

    p.angle += 0.0005 * activity;
  }
}

// Keyboard shortcut kept as a convenience for desktop / dev use;
// the touchscreen kiosk uses the on-screen button created in setup.
function keyPressed() {
  if (key === "c" || key === "C") calibrate();

  if (key === "0") manualEmotion = null;
  if (key === "1") manualEmotion = "neutral";
  if (key === "2") manualEmotion = "happy";
  if (key === "3") manualEmotion = "sad";
  if (key === "4") manualEmotion = "surprised";
  if (key === "5") manualEmotion = "fearful";
}

function drawParticles(activity) {
  blendMode(ADD);
  noStroke();

  for (let p of particles) {
    let r = sqrt(p.x * p.x + p.y * p.y);
    let a = atan2(p.y, p.x);

    let petals = int(map(freqSmooth, 200, 4200, 6, 18, true));

    let node =
      abs(sin(a * petals)) *
      abs(sin(r * 0.035));

    let alpha = map(node, 0, 1, 5, 255, true);
    alpha *= map(glowAmount, 0.3, 1.5, 0.65, 1.4, true);

    let s = map(node, 0, 1, 0.15, 2.4, true) * p.size;

    fill(hueValue, 70, 100, alpha);
    circle(p.x, p.y, s);
  }

  blendMode(BLEND);
}


function chladni(x, y, m, n) {
  let plate =
    cos(n * PI * x) * cos(m * PI * y) - cos(m * PI * x) * cos(n * PI * y);

  let radial = sin((m + n) * PI * sqrt(x * x + y * y));

  return plate * 0.82 + radial * 0.18;
}

function drawInfo() {
  resetMatrix();

  fill(0, 0, 100, 140);
  noStroke();
  textSize(12);
  textAlign(LEFT, BOTTOM);

  text(
    "FaceMesh mood: " +
      currentEmotion +
      " | Smile: " +
      nf(smileSmooth, 1, 2) +
      " | Mouth: " +
      nf(mouthOpenSmooth, 1, 2) +
      " | Freq: " +
      int(freqSmooth) +
      "Hz | Modes: " +
      int(modeX) +
      ", " +
      int(modeY),
    24,
    height - 24
  );
}

function mousePressed() {
  userStartAudio();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  createParticles();
  background(0);
}