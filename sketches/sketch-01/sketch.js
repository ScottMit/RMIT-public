// WELCOME TO EARTH

// ── MATTER.JS ALIASES ─────────────────────────────────────────────
let Engine, Bodies, Body, Events, Composite, Vector;
let engine, world;

// ── PADDLES ───────────────────────────────────────────────────────
let topPaddle, bottomPaddle, leftPaddle, rightPaddle;

// ── ORBS ──────────────────────────────────────────────────────────
let orbs = [];

// ── GAME STATE ────────────────────────────────────────────────────
// 'intro' → 'country' → 'generation' → 'result'
let gameState = 'intro';
let result    = { country: null, gen: null, age: null };

// ── INTRO ANIMATION ───────────────────────────────────────────────
let introAlpha   = 0;    // fade in
let introPulse   = 0;    // prompt pulse
let introClicked = false;

// ── CONSTANTS ─────────────────────────────────────────────────────
const WALL_T     = 20;
const PADDLE_T   = 12;
const PADDLE_SPD = 3;
const ORB_MIN    = 6;
const ORB_MAX    = 55;
const GEN_MIN    = 18;
const GEN_MAX    = 60;

// ── COUNTRY DATA ──────────────────────────────────────────────────
const countryData = [
  { name: "India",          pct: 0.1845 },
  { name: "China",          pct: 0.1765 },
  { name: "United States",  pct: 0.0436 },
  { name: "Indonesia",      pct: 0.036  },
  { name: "Pakistan",       pct: 0.0324 },
  { name: "Nigeria",        pct: 0.0303 },
  { name: "Brazil",         pct: 0.0267 },
  { name: "Bangladesh",     pct: 0.0222 },
  { name: "Russia",         pct: 0.0179 },
  { name: "Ethiopia",       pct: 0.0174 },
  { name: "Mexico",         pct: 0.0166 },
  { name: "Japan",          pct: 0.0153 },
  { name: "Egypt",          pct: 0.015  },
  { name: "Philippines",    pct: 0.0147 },
  { name: "DR Congo",       pct: 0.0145 },
  { name: "Vietnam",        pct: 0.0128 },
  { name: "Iran",           pct: 0.0116 },
  { name: "Turkey",         pct: 0.011  },
  { name: "Germany",        pct: 0.0104 },
  { name: "Tanzania",       pct: 0.0091 },
  { name: "Thailand",       pct: 0.0089 },
  { name: "United Kingdom", pct: 0.0087 },
  { name: "France",         pct: 0.0083 },
  { name: "South Africa",   pct: 0.0082 },
  { name: "Italy",          pct: 0.0074 },
  { name: "Kenya",          pct: 0.0073 },
  { name: "Myanmar",        pct: 0.0069 },
  { name: "Colombia",       pct: 0.0067 },
  { name: "Sudan",          pct: 0.0067 },
  { name: "Uganda",         pct: 0.0066 },
  { name: "South Korea",    pct: 0.0064 },
  { name: "Algeria",        pct: 0.006  },
  { name: "Iraq",           pct: 0.006  },
  { name: "Spain",          pct: 0.006  },
  { name: "Argentina",      pct: 0.0057 },
  { name: "Afghanistan",    pct: 0.0056 },
  { name: "Yemen",          pct: 0.0054 },
  { name: "Canada",         pct: 0.0051 },
  { name: "Angola",         pct: 0.005  },
  { name: "Ukraine",        pct: 0.0049 },
  { name: "Morocco",        pct: 0.0048 },
  { name: "Poland",         pct: 0.0047 },
  { name: "Uzbekistan",     pct: 0.0047 },
  { name: "Mozambique",     pct: 0.0046 },
  { name: "Malaysia",       pct: 0.0045 }, // I use to live here for four years! (When I was younger)
  { name: "Ghana",          pct: 0.0045 },
  { name: "Saudi Arabia",   pct: 0.0044 },
  { name: "Peru",           pct: 0.0044 },
  { name: "Madagascar",     pct: 0.0042 },
  { name: "Ivory Coast",    pct: 0.0042 },
]; 

// Unforunately Australia didn't make the cut... its just out of the top 50. 

// ── GENERATION DATA ───────────────────────────────────────────────
const generationData = [
  { name: "Silent Gen",  start: 1928, end: 1945, ageMin: 81, ageMax: 98, norm: 0.93  }, 
  { name: "Boomers",     start: 1946, end: 1964, ageMin: 62, ageMax: 80, norm: 1.0   },
  { name: "Gen X",       start: 1965, end: 1980, ageMin: 46, ageMax: 61, norm: 0.727 },
  { name: "Millennials", start: 1981, end: 1996, ageMin: 30, ageMax: 45, norm: 0.623 },
  { name: "Gen Z",       start: 1997, end: 2012, ageMin: 14, ageMax: 29, norm: 0.501 },
  { name: "Gen Alpha",   start: 2013, end: 2025, ageMin:  1, ageMax: 13, norm: 0.346 },
];

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('monospace');

  Engine    = Matter.Engine;
  Bodies    = Matter.Bodies;
  Body      = Matter.Body;
  Events    = Matter.Events;
  Composite = Matter.Composite;
  Vector    = Matter.Vector;

  engine = Engine.create({ gravity: { x: 0, y: 0 } });
  world  = engine.world;
}

// ── DRAW LOOP ─────────────────────────────────────────────────────
function draw() {
  background(0);

  if      (gameState === 'intro')      drawIntro();
  else if (gameState === 'country')    drawCountry();
  else if (gameState === 'generation') drawGeneration();
  else if (gameState === 'result')     drawResult();
}

// ── INTRO SCREEN ──────────────────────────────────────────────────
function drawIntro() {
  // Fade in over ~60 frames
  introAlpha = min(introAlpha + 4, 255);
  introPulse += 0.05;

  const cx = width / 2;
  const cy = height / 2;

  // Title
  fill(255, introAlpha);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(11);
  text('EARTH', cx, cy - 60);

  // Divider
  stroke(255, introAlpha);
  strokeWeight(1);
  line(cx - 80, cy - 44, cx + 80, cy - 44);
  noStroke();

  // Main prompt - pulses once fully faded in
  let promptAlpha = introAlpha < 255 ? introAlpha : 180 + sin(introPulse) * 75;
  fill(255, promptAlpha);
  textSize(14);
  text('TOUCH SCREEN TO JOIN EARTH', cx, cy - 12);

  // Sub line
  fill(255, introAlpha * 0.5);
  textSize(9);
  text('a simulation of circumstance', cx, cy + 16);

  // Bottom credit
  fill(255, introAlpha * 0.35);
  textSize(8);
  text('data: UN World Population Prospects 2024  |  World Population 2026', cx, cy + 60);
}

// ── COUNTRY GAME ──────────────────────────────────────────────────
function drawCountry() {
  Engine.update(engine, 1000 / 60);

  stroke(255); strokeWeight(1); noFill();
  rect(WALL_T, WALL_T, width - WALL_T * 2, height - WALL_T * 2);

  let target = getNearestOrb();
  if (target) {
    trackOrb(topPaddle,    target, 'horizontal');
    trackOrb(bottomPaddle, target, 'horizontal');
    trackOrb(leftPaddle,   target, 'vertical');
    trackOrb(rightPaddle,  target, 'vertical');
  }

  fill(255); noStroke();
  drawBody(topPaddle); drawBody(bottomPaddle);
  drawBody(leftPaddle); drawBody(rightPaddle);

  for (let orb of orbs) {
    const r = orb.radius;
    fill(255); noStroke();
    ellipse(orb.position.x, orb.position.y, r * 2, r * 2);
    if (r > 14) {
      fill(0); noStroke();
      textAlign(CENTER, CENTER);
      textSize(constrain(r * 0.28, 7, 12));
      text(orb.countryData.name, orb.position.x, orb.position.y);
    }
  }

  fill(255); noStroke();
  textAlign(LEFT, TOP); textSize(10);
  text('GAME 1  WHERE YOU WILL BE BORN', WALL_T + 8, WALL_T + 8);
  textAlign(RIGHT, TOP);
  text(orbs.length + ' remaining', width - WALL_T - 8, WALL_T + 8);

  checkAllBounds();

  if (orbs.length === 1) {
    result.country = orbs[0].countryData;
    Composite.clear(world, false);
    buildArena();
    spawnGenOrbs();
    gameState = 'generation';
  }

  if (orbs.length === 0) {
    Composite.clear(world, false);
    buildArena();
    spawnCountryOrbs();
  }
}

// ── GENERATION GAME ───────────────────────────────────────────────
function drawGeneration() {
  Engine.update(engine, 1000 / 60);

  stroke(255); strokeWeight(1); noFill();
  rect(WALL_T, WALL_T, width - WALL_T * 2, height - WALL_T * 2);

  let target = getNearestOrb();
  if (target) {
    trackOrb(topPaddle,    target, 'horizontal');
    trackOrb(bottomPaddle, target, 'horizontal');
    trackOrb(leftPaddle,   target, 'vertical');
    trackOrb(rightPaddle,  target, 'vertical');
  }

  fill(255); noStroke();
  drawBody(topPaddle); drawBody(bottomPaddle);
  drawBody(leftPaddle); drawBody(rightPaddle);

  for (let orb of orbs) {
    const r = orb.radius;
    fill(255); noStroke();
    ellipse(orb.position.x, orb.position.y, r * 2, r * 2);
    if (r > 22) {
      fill(0); noStroke();
      textAlign(CENTER, CENTER);
      textSize(constrain(r * 0.3, 9, 14));
      text(orb.genData.name, orb.position.x, orb.position.y);
    }
  }

  fill(255); noStroke();
  textAlign(LEFT, TOP); textSize(10);
  text('GAME 2  WHEN YOU WILL BE BORN', WALL_T + 8, WALL_T + 8);
  textAlign(RIGHT, TOP);
  text(orbs.length + ' remaining', width - WALL_T - 8, WALL_T + 8);

  // Country result persists in corner
  if (result.country) {
    textAlign(LEFT, BOTTOM);
    textSize(10);
    fill(255);
    text('WHERE  ' + result.country.name.toUpperCase(), WALL_T + 8, height - WALL_T - 8);
  }

  checkAllBounds();

  if (orbs.length === 1) {
    const g   = orbs[0].genData;
    const age = floor(random(g.ageMin, g.ageMax + 1));
    result.gen = g;
    result.age = age;
    gameState  = 'result';
  }

  if (orbs.length === 0) {
    Composite.clear(world, false);
    buildArena();
    spawnGenOrbs();
  }
}

// ── RESULT SCREEN ─────────────────────────────────────────────────
function drawResult() {
  background(0);
  textAlign(CENTER, CENTER);
  noStroke();

  const cx = width / 2;
  const cy = height / 2;

  // Title
  fill(255);
  textSize(11);
  text('YOU WILL BE...', cx, cy - 120);

  stroke(255); strokeWeight(1);
  line(cx - 140, cy - 102, cx + 140, cy - 102);
  noStroke();

  // Country block
  fill(180);
  textSize(9);
  text('BORN IN', cx, cy - 82);

  fill(255);
  textSize(30);
  text(result.country ? result.country.name.toUpperCase() : '?', cx, cy - 52);

  // Generation block
  fill(180);
  textSize(9);
  text('AS A', cx, cy - 4);

  fill(255);
  textSize(30);
  text(result.gen ? result.gen.name.toUpperCase() : '?', cx, cy + 28);

  // Age + birth year
  fill(255);
  textSize(13);
  const birthYear = 2026 - result.age;
  text('Age ' + result.age + '  |  Born ' + birthYear, cx, cy + 66);

  // Gen span
  fill(120);
  textSize(9);
  text('(' + result.gen.start + ' - ' + result.gen.end + ')', cx, cy + 86);

  stroke(255); strokeWeight(1);
  line(cx - 140, cy + 102, cx + 140, cy + 102);
  noStroke();

  // Prompt
  fill(255);
  textSize(10);
  text('touch screen to play again', cx, cy + 122);

  // Data credit bottom
  fill(80);
  textSize(8);
  textAlign(CENTER, BOTTOM);
  text('data: UN World Population Prospects 2024  |  World Population 2026', cx, height - 12);
}

// ── INPUT ─────────────────────────────────────────────────────────
function mousePressed() {
  if (gameState === 'intro') {
    // First click - start the simulation
    buildArena();
    spawnCountryOrbs();
    gameState = 'country';
  } else if (gameState === 'result') {
    Composite.clear(world, false);
    result    = { country: null, gen: null, age: null };
    buildArena();
    spawnCountryOrbs();
    gameState = 'country';
  }
}

// ── ARENA ─────────────────────────────────────────────────────────
function buildArena() {
  const PW = constrain(width * 0.1, 80, 160);
  const PT = PADDLE_T;
  const W  = width, H = height;
  const paddleOpts = { isStatic: true, restitution: 1, friction: 0, frictionAir: 0, label: 'paddle' };

  topPaddle    = Bodies.rectangle(W / 2,           WALL_T + PT,     PW, PT, paddleOpts);
  bottomPaddle = Bodies.rectangle(W / 2,           H - WALL_T - PT, PW, PT, paddleOpts);
  leftPaddle   = Bodies.rectangle(WALL_T + PT,     H / 2,           PT, PW, paddleOpts);
  rightPaddle  = Bodies.rectangle(W - WALL_T - PT, H / 2,           PT, PW, paddleOpts);

  Composite.add(world, [topPaddle, bottomPaddle, leftPaddle, rightPaddle]);
}

// ── SPAWN ─────────────────────────────────────────────────────────
function spawnCountryOrbs() {
  orbs = [];
  const cx = width / 2, cy = height / 2;
  const maxPct = countryData[0].pct;

  for (let i = 0; i < countryData.length; i++) {
    const c    = countryData[i];
    const norm = c.pct / maxPct;
    const r    = map(norm, 0, 1, ORB_MIN, ORB_MAX);

    const spawnAngle = (TWO_PI / countryData.length) * i;
    const spawnDist  = random(20, 60);
    const sx = cx + cos(spawnAngle) * spawnDist;
    const sy = cy + sin(spawnAngle) * spawnDist;

    const body = Bodies.circle(sx, sy, r, {
      restitution: 1.1, friction: 0, frictionAir: 0,
      label: 'orb', countryData: c, radius: r
    });

    const speed = random(4, 7);
    Body.setVelocity(body, {
      x: cos(random(TWO_PI)) * speed,
      y: sin(random(TWO_PI)) * speed
    });

    Composite.add(world, body);
    orbs.push(body);
  }
}

function spawnGenOrbs() {
  orbs = [];
  const cx = width / 2, cy = height / 2;

  for (let i = 0; i < generationData.length; i++) {
    const g = generationData[i];
    const r = map(g.norm, 0, 1, GEN_MIN, GEN_MAX);

    const spawnAngle = (TWO_PI / generationData.length) * i;
    const sx = cx + cos(spawnAngle) * 40;
    const sy = cy + sin(spawnAngle) * 40;

    const body = Bodies.circle(sx, sy, r, {
      restitution: 1, friction: 0, frictionAir: 0,
      label: 'orb', genData: g, radius: r
    });

    Body.setVelocity(body, {
      x: cos(random(TWO_PI)) * 5,
      y: sin(random(TWO_PI)) * 5
    });

    Composite.add(world, body);
    orbs.push(body);
  }
}

// ── HELPERS ───────────────────────────────────────────────────────
function checkAllBounds() {
  for (let i = orbs.length - 1; i >= 0; i--) {
    const pos = orbs[i].position;
    if (pos.x < 0 || pos.x > width || pos.y < 0 || pos.y > height) {
      Composite.remove(world, orbs[i]);
      orbs.splice(i, 1);
    }
  }
}

function getNearestOrb() {
  if (orbs.length === 0) return null;
  const cx = width / 2, cy = height / 2;
  let nearest = orbs[0];
  let best    = dist(nearest.position.x, nearest.position.y, cx, cy);
  for (let o of orbs) {
    let d = dist(o.position.x, o.position.y, cx, cy);
    if (d < best) { nearest = o; best = d; }
  }
  return nearest;
}

function trackOrb(paddle, orb, axis) {
  const op = orb.position, pp = paddle.position;
  const PW = constrain(width * 0.1, 80, 160);

  if (axis === 'horizontal') {
    let newX = constrain(
      pp.x + constrain(op.x - pp.x, -PADDLE_SPD, PADDLE_SPD),
      WALL_T + PW / 2, width - WALL_T - PW / 2
    );
    Body.setPosition(paddle, { x: newX, y: pp.y });
  } else {
    let newY = constrain(
      pp.y + constrain(op.y - pp.y, -PADDLE_SPD, PADDLE_SPD),
      WALL_T + PW / 2, height - WALL_T - PW / 2
    );
    Body.setPosition(paddle, { x: pp.x, y: newY });
  }
}

function drawBody(body) {
  beginShape();
  for (let v of body.vertices) vertex(v.x, v.y);
  endShape(CLOSE);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// According to my first official run I will be a Gen Z born in Mexico! VAMOS