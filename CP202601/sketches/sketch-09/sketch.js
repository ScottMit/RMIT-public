let Engine = Matter.Engine,
  Bodies = Matter.Bodies,
  Composite = Matter.Composite,
  Constraint = Matter.Constraint,
  Mouse = Matter.Mouse,
  MouseConstraint = Matter.MouseConstraint;

let engine;
let chains = [];
let boundary;
let numOfChains = 5;
let ballR = 15;
let pivY = 180;
let segments = [];

function setup() {
  let canvas = createCanvas(500, 500);

  engine = Engine.create();
  engine.positionIterations = 20;
  engine.velocityIterations = 20;

  let posV = createVector(width, 50);
  let lineV = createVector(-width, 0);

  segments.push(new KochLine(posV, lineV));

  for (let i = 0; i < 5; i++) {
    generate();
  }

  for (let s of segments) {
    s.makeBody();
  }

  let spacing = ballR * 2;
  let startX = (width - numOfChains * spacing) / 2 + ballR;

  // FIX 1: Set a unified target hanging level for all balls
  // (Equivalent to the old depth: 50px starting baseline + 165px string length)
  let targetBallY = 350; 

  for (let i = 0; i < numOfChains; i++) {
    let currentX = startX + spacing * i;
    let colors = [color(111, 45, 168), color(36, 72, 108), color(167, 47, 72)];
    let uniqueChainColor = colors[i % colors.length];

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

    // FIX 2: Anchor the ceiling pivot point dynamically right on the local KochLine edge
    let currentPivY = localLowestY; 

    let balls = [];
    let ceilingPivot = new Ball(currentX, currentPivY, 2, true, color(150));
    
    let isFirstChain = i === 0;
    
    // FIX 3: Calculate a custom string length for this specific chain strand
    let rigidStringLength = targetBallY - currentPivY; 

    let spawnX = currentX;
    let spawnY = targetBallY; // Resting balls sit precisely at the target level

    if (isFirstChain) {
      let angle = radians(-45); 
      spawnX = currentX + sin(angle) * rigidStringLength;
      spawnY = currentPivY + cos(angle) * rigidStringLength;
    }

    let ballLink = new Ball(spawnX, spawnY, ballR, false, uniqueChainColor);
    balls.push(ballLink);

    Matter.Body.set(ballLink.body, {
      restitution: 1.0,
      friction: 0.0,
      frictionAir: 0.0002,
      slop: 0,
    });

    let options = {
      bodyA: ballLink.body,
      bodyB: ceilingPivot.body,
      length: rigidStringLength, // Uses the custom dynamic length
      stiffness: 1.0,
    };

    let constraint = Constraint.create(options);
    Composite.add(engine.world, constraint);

    let c = new Chain(balls);
    chains.push(c);
  }

  boundary = new Boundary(width / 2, height, width * 2, 10, 0);

  let canvasMouse = Mouse.create(canvas.elt);
  canvasMouse.pixelRatio = pixelDensity();
  var options = { mouse: canvasMouse };
  let mConstraint = MouseConstraint.create(engine, options);
  Composite.add(engine.world, mConstraint);
}

function draw() {
  background(240, 248, 255);
  Engine.update(engine);

  // Render the visible strings
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