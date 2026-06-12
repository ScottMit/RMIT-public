// Combined sketch: Newton Cradle (left) + Vineyard (right)
// Both halves share a single Matter engine and a single Koch-line canopy
// stretched across the full width, so the visual continuity reads as one
// scene with two interactions side by side.

let Engine = Matter.Engine,
  Bodies = Matter.Bodies,
  Composite = Matter.Composite,
  Constraint = Matter.Constraint,
  Mouse = Matter.Mouse,
  MouseConstraint = Matter.MouseConstraint;

let engine;
let chains = [];
let boundary;
let segments = [];

// Canvas geometry — two square halves side by side
const W = 1000;
const H = 500;
const HALF = W / 2;

const ballR = 15;
const CHAIN_COLORS_RAW = [
  [111, 45, 168],
  [36, 72, 108],
  [167, 47, 72],
];

function setup() {
  let canvas = createCanvas(W, H);

  engine = Engine.create();
  engine.positionIterations = 20;
  engine.velocityIterations = 20;

  // Two independent Koch-line canopies — one per half. Keeping them
  // separate means each half's deepest dip falls in the centre of its
  // own image instead of at the seam where the two interactions meet,
  // so the chains hang symmetrically within each scene.
  // Order matters: right-half first, then left-half, so the canopy is
  // traced right-to-left for the green fill shape in draw().
  segments.push(new KochLine(createVector(W, 50), createVector(-HALF, 0)));
  segments.push(new KochLine(createVector(HALF, 50), createVector(-HALF, 0)));
  for (let i = 0; i < 5; i++) generate();
  for (let s of segments) s.makeBody();

  // Left half: Newton Cradle (sketch-09)
  buildNewtonCradle(HALF / 2);

  // Right half: Vineyard (sketch-10)
  buildVineyard(HALF + HALF / 2);

  boundary = new Boundary(W / 2, H, W * 2, 10, 0);

  // One mouse constraint covers the whole canvas — drags work on both halves
  let canvasMouse = Mouse.create(canvas.elt);
  canvasMouse.pixelRatio = pixelDensity();
  let mConstraint = MouseConstraint.create(engine, { mouse: canvasMouse });
  Composite.add(engine.world, mConstraint);
}

// ── NEWTON CRADLE (single rigid pendulum per chain, first ball swung) ──
function buildNewtonCradle(centerX) {
  const numOfChains = 5;
  const spacing = ballR * 2;
  const startX = centerX - (numOfChains * spacing) / 2 + ballR;
  const targetBallY = 350;

  for (let i = 0; i < numOfChains; i++) {
    let currentX = startX + spacing * i;
    let uniqueChainColor = pickChainColor(i);

    let currentPivY = localCanopyY(currentX, spacing);
    let rigidStringLength = targetBallY - currentPivY;

    let ceilingPivot = new Ball(currentX, currentPivY, 2, true, color(150));

    let spawnX = currentX;
    let spawnY = targetBallY;
    if (i === 0) {
      let angle = radians(-45);
      spawnX = currentX + sin(angle) * rigidStringLength;
      spawnY = currentPivY + cos(angle) * rigidStringLength;
    }

    let ballLink = new Ball(spawnX, spawnY, ballR, false, uniqueChainColor);
    Matter.Body.set(ballLink.body, {
      restitution: 1.0,
      friction: 0.0,
      frictionAir: 0.0002,
      slop: 0,
    });

    let constraint = Constraint.create({
      bodyA: ballLink.body,
      bodyB: ceilingPivot.body,
      length: rigidStringLength,
      stiffness: 1.0,
    });
    Composite.add(engine.world, constraint);

    chains.push(new Chain([ballLink]));
  }
}

// ── VINEYARD (6-ball chain per strand, first chain swung) ──
function buildVineyard(centerX) {
  const numOfChains = 5;
  const numOfBalls = 6;
  const spacing = ballR * 2;
  const startX = centerX - (numOfChains * spacing) / 2 + ballR;
  const firstLinkLength = 18;
  const chainLinkLength = 30;

  for (let i = 0; i < numOfChains; i++) {
    let currentX = startX + spacing * i;
    let uniqueChainColor = pickChainColor(i);

    let currentPivY = localCanopyY(currentX, spacing);

    let balls = [];
    let ceilingPivot = new Ball(currentX, currentPivY, 5, true, color(150));
    balls.push(ceilingPivot);

    let prevBall = ceilingPivot;
    let isFirstChain = i === 0;

    for (let j = 0; j < numOfBalls; j++) {
      let totalDist = firstLinkLength + (chainLinkLength * j);
      let spawnX = currentX;
      let spawnY = currentPivY + totalDist;

      if (isFirstChain) {
        let angle = radians(-45);
        spawnX = currentX + sin(angle) * totalDist;
        spawnY = currentPivY + cos(angle) * totalDist;
      }

      let ballLink = new Ball(spawnX, spawnY, ballR, false, uniqueChainColor);
      balls.push(ballLink);

      Matter.Body.set(ballLink.body, {
        restitution: 1.0,
        friction: 0.0,
        frictionAir: 0.001,
        slop: 0,
      });

      let constraint = Constraint.create({
        bodyA: ballLink.body,
        bodyB: prevBall.body,
        length: j === 0 ? firstLinkLength : chainLinkLength,
        stiffness: 1.0,
      });
      Composite.add(engine.world, constraint);

      prevBall = ballLink;
    }

    balls.shift(); // drop the static ceiling pivot from the drawn set
    chains.push(new Chain(balls));
  }
}

// ── HELPERS ──
function pickChainColor(i) {
  let c = CHAIN_COLORS_RAW[i % CHAIN_COLORS_RAW.length];
  return color(c[0], c[1], c[2]);
}

// Find the lowest canopy y-value directly above currentX so the chain
// hangs from the actual fractal edge instead of a flat ceiling.
function localCanopyY(currentX, spacing) {
  let localLowestY = 50;
  for (let s of segments) {
    if (s.body && s.body.vertices) {
      for (let vertex of s.body.vertices) {
        let d = abs(vertex.x - currentX);
        if (d < spacing / 2 && vertex.y > localLowestY) {
          localLowestY = vertex.y;
        }
      }
    }
  }
  return localLowestY;
}

function draw() {
  background(240, 248, 255);
  Engine.update(engine);

  // Visible strings between all linked bodies
  let allConstraints = Composite.allConstraints(engine.world);
  stroke(100);
  strokeWeight(1.5);
  for (let c of allConstraints) {
    if (c.label !== "Mouse Constraint") {
      let posA = c.bodyA.position;
      let posB = c.bodyB.position;
      line(posA.x, posA.y, posB.x, posB.y);
    }
  }

  // Green canopy + balls (matches the original draw-loop style from both sketches)
  noStroke();
  fill(58, 144, 97);
  beginShape();
  vertex(width, 0);
  for (let s of segments) {
    if (s.body && s.body.position) {
      vertex(s.body.position.x, s.body.position.y);
    }
  }
  for (let c of chains) {
    c.show();
  }
  for (let s of segments) {
    if (s.body && s.body.position) {
      vertex(s.body.position.x, s.body.position.y);
    }
  }
  vertex(0, 0);
  endShape(CLOSE);

  boundary.show();

  // Subtle divider so visitors read the canvas as two pieces, not one
  stroke(0, 0, 0, 25);
  strokeWeight(1);
  line(HALF, 0, HALF, H);
}

function generate() {
  let newSegments = [];
  for (let s of segments) {
    let [p1, l1, p2, l2, p3, l3, p4, l4] = s.generate();
    newSegments.push(new KochLine(p1, l1));
    newSegments.push(new KochLine(p2, l2));
    newSegments.push(new KochLine(p3, l3));
    newSegments.push(new KochLine(p4, l4));
  }
  segments = newSegments;
}
