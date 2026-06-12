let video;
let handPose;
let predictions = [];

let Engine = Matter.Engine,
  World = Matter.World,
  Bodies = Matter.Bodies,
  Body = Matter.Body,
  Events = Matter.Events;

let engine;
let world;

let ball;
let walls = [];
let handBodies = [];

let score = 0;
let bestScore = 0;

let state = "start";

let level = 1;
let hitsToLevelUp = 15;

let loseStartTime = 0;
let loseDuration = 5000;

let lastHitTime = 0;
let hitCooldown = 120;

// Video is captured at a fixed resolution for stable ml5 hand-pose
// detection. The canvas, however, fills the viewport so the video and
// the game scale to whatever frame the sketch is shown in.
const VIDEO_W = 1280;
const VIDEO_H = 720;

let maxSpeed = 22;

let tipIndexes = [4, 8, 12, 16, 20];

function preload() {
  handPose = ml5.handPose();
}

function gotResults(results) {
  predictions = results;
}

function setup() {
  createCanvas(windowWidth, windowHeight);

  engine = Engine.create();
  world = engine.world;

  engine.world.gravity.y = 0.35;

  // Balloon
  ball = Bodies.circle(width / 2, height / 3, 50, {
    restitution: 0.95,
    frictionAir: 0.012,
    density: 0.00025,
  });

  World.add(world, ball);

  // Walls — sized and placed against the live canvas
  let t = 120;

  walls.push(
    Bodies.rectangle(-t / 2, height / 2, t, height, {
      isStatic: true,
    })
  );

  walls.push(
    Bodies.rectangle(width + t / 2, height / 2, t, height, {
      isStatic: true,
    })
  );

  walls.push(
    Bodies.rectangle(width / 2, -t / 2, width, t, {
      isStatic: true,
    })
  );

  World.add(world, walls);

  // Hand colliders
  for (let i = 0; i < 10; i++) {
    let body = Bodies.circle(-1000, -1000, 18, {
      isStatic: true,
    });

    handBodies.push(body);

    World.add(world, body);
  }

  // Collisions
  Events.on(engine, "collisionStart", (event) => {
    for (let pair of event.pairs) {
      let a = pair.bodyA;
      let b = pair.bodyB;

      if (a === ball || b === ball) {
        let other = a === ball ? b : a;

        // Hand hit
        if (handBodies.includes(other)) {
          boostBounce(other);

          // Score cooldown
          if (millis() - lastHitTime > hitCooldown) {
            score++;

            lastHitTime = millis();

            if (score % hitsToLevelUp === 0) {
              levelUp();
            }
          }
        }

        // Wall hit
        if (walls.includes(other)) {
          wallBounce();
        }
      }
    }
  });

  // Camera — captured at fixed VIDEO_W × VIDEO_H so ml5 hand-pose has
  // a consistent input regardless of how big the canvas becomes.
  video = createCapture(VIDEO);

  video.size(VIDEO_W, VIDEO_H);

  video.hide();

  handPose.detectStart(video, gotResults);

  textFont("Arial");
}

function draw() {
  background(0);

  if (state === "start") {
    drawStartScreen();
    checkGestureStart();

    return;
  }

  if (state === "lose") {
    drawLoseScreen();

    if (millis() - loseStartTime > loseDuration) {
      resetToStart();
    }

    return;
  }

  playGame();
}

function playGame() {
  // CAMERA — draw the video flipped horizontally and stretched to
  // fill the canvas so it always reads as a full-frame backdrop.
  push();

  translate(width, 0);
  scale(-1, 1);

  image(video, 0, 0, width, height);

  pop();

  // Update physics
  Engine.update(engine);

  // Floating force
  Body.applyForce(ball, ball.position, {
    x: 0,
    y: -0.00045,
  });

  // Wind
  if (level >= 3) {
    Body.applyForce(ball, ball.position, {
      x: random(-0.0007, 0.0007),
      y: 0,
    });
  }

  // Speed limit
  limitBallSpeed();

  // Lose condition
  if (ball.position.y > height + 120) {
    state = "lose";

    loseStartTime = millis();

    bestScore = max(bestScore, score);
  }

  // Danger line
  stroke(255, 0, 0);
  strokeWeight(4);

  line(0, height - 20, width, height - 20);

  // Draw balloon
  drawBalloon();

  // Update hands
  updateHandBodies();

  // Draw hands
  drawHandSkeletons();

  // UI
  drawUI();
}

function updateHandBodies() {
  let bodyIndex = 0;

  // Keypoints arrive in VIDEO_W × VIDEO_H space — rescale them onto
  // the (potentially larger or differently-shaped) canvas before
  // positioning the physics colliders. Also flip x for selfie mirror.
  const scaleX = width / VIDEO_W;
  const scaleY = height / VIDEO_H;

  for (let hand of predictions) {
    for (let i of tipIndexes) {
      if (bodyIndex >= handBodies.length) return;

      let kp = hand.keypoints[i];

      Body.setPosition(handBodies[bodyIndex], {
        x: width - kp.x * scaleX,
        y: kp.y * scaleY,
      });

      bodyIndex++;
    }
  }

  // Unused bodies off screen
  for (let i = bodyIndex; i < handBodies.length; i++) {
    Body.setPosition(handBodies[i], {
      x: -1000,
      y: -1000,
    });
  }
}

function boostBounce(handBody) {
  // Direction
  let dx = ball.position.x - handBody.position.x;
  let dy = ball.position.y - handBody.position.y;

  let mag = sqrt(dx * dx + dy * dy);

  if (mag === 0) mag = 1;

  dx /= mag;
  dy /= mag;

  let force = 12 + level * 1.3;

  // Sideways bounce
  Body.setVelocity(ball, {
    x: dx * force * 1.6,

    y: dy * force - 8,
  });

  // Extra float
  Body.applyForce(ball, ball.position, {
    x: dx * 0.03,
    y: dy * 0.03,
  });
}

function wallBounce() {
  Body.setVelocity(ball, {
    x: ball.velocity.x * 1.01,

    y: ball.velocity.y * 0.98,
  });
}

function limitBallSpeed() {
  let vx = constrain(ball.velocity.x, -maxSpeed, maxSpeed);

  let vy = constrain(ball.velocity.y, -maxSpeed, maxSpeed);

  Body.setVelocity(ball, {
    x: vx,
    y: vy,
  });
}

function levelUp() {
  level++;

  engine.world.gravity.y += 0.04;
}

function drawBalloon() {
  push();

  translate(ball.position.x, ball.position.y);

  // Shadow
  noStroke();

  fill(0, 0, 0, 80);

  ellipse(6, 8, 95, 105);

  // Balloon
  fill(255, 80, 120);

  ellipse(0, 0, 100, 110);

  // Highlight
  fill(255, 180);

  ellipse(-18, -20, 20, 30);

  // String
  stroke(255);
  strokeWeight(3);

  line(0, 55, 0, 95);

  pop();
}

function drawHandSkeletons() {
  const scaleX = width / VIDEO_W;
  const scaleY = height / VIDEO_H;

  for (let hand of predictions) {
    for (let kp of hand.keypoints) {
      fill(0, 255, 255);

      noStroke();

      circle(width - kp.x * scaleX, kp.y * scaleY, 12);
    }
  }
}

function drawUI() {
  fill(255);

  noStroke();

  textAlign(LEFT);

  textSize(30);

  text("Score: " + score, 20, 40);

  text("Level: " + level, 20, 80);

  text("Best: " + bestScore, 20, 120);
}

function resetBall() {
  Body.setPosition(ball, {
    x: width / 2,
    y: height / 3,
  });

  Body.setVelocity(ball, {
    x: random(-4, 4),
    y: 0,
  });
}

function startGame() {
  state = "play";

  score = 0;

  level = 1;

  engine.world.gravity.y = 0.35;

  resetBall();
}

function resetToStart() {
  state = "start";

  score = 0;

  level = 1;

  engine.world.gravity.y = 0.35;

  resetBall();
}

function checkGestureStart() {
  if (predictions.length > 0) {
    startGame();
  }
}

function drawStartScreen() {
  background(10);

  textAlign(CENTER);

  fill(255);

  textSize(64);

  text("BALLOON KEEPY UPPY", width / 2, height / 2 - 120);

  textSize(28);

  text("Show your hand to start", width / 2, height / 2);

  textSize(22);

  text("Hit the balloon with your fingertips", width / 2, height / 2 + 60);

  text("Higher levels = stronger wind", width / 2, height / 2 + 100);
}

function drawLoseScreen() {
  background(20, 0, 0);

  textAlign(CENTER);

  fill(255, 80, 80);

  textSize(72);

  text("YOU LOST", width / 2, height / 2 - 120);

  fill(255);

  textSize(36);

  text("Score: " + score, width / 2, height / 2 - 20);

  text("Best: " + bestScore, width / 2, height / 2 + 40);

  textSize(24);

  text("Returning to start...", width / 2, height / 2 + 120);
}

// Keep the canvas matched to the viewport (gallery resize, fullscreen
// toggle, browser window resize). The physics walls and balloon are
// rebuilt against the new dimensions so the play area stays sane.
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);

  // Reposition static walls to the new edges
  if (walls.length === 3) {
    let t = 120;
    Body.setPosition(walls[0], { x: -t / 2, y: height / 2 });
    Body.setPosition(walls[1], { x: width + t / 2, y: height / 2 });
    Body.setPosition(walls[2], { x: width / 2, y: -t / 2 });
  }
}
