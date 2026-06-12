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

let W = 1280;
let H = 720;

let maxSpeed = 22;

let tipIndexes = [4, 8, 12, 16, 20];

function preload() {
  handPose = ml5.handPose();
}

function gotResults(results) {
  predictions = results;
}

function setup() {
  createCanvas(W, H);

  engine = Engine.create();
  world = engine.world;

  engine.world.gravity.y = 0.35;

  // Balloon
  ball = Bodies.circle(W / 2, H / 3, 50, {
    restitution: 0.95,
    frictionAir: 0.012,
    density: 0.00025,
  });

  World.add(world, ball);

  // Walls
  let t = 120;

  walls.push(
    Bodies.rectangle(-t / 2, H / 2, t, H, {
      isStatic: true,
    })
  );

  walls.push(
    Bodies.rectangle(W + t / 2, H / 2, t, H, {
      isStatic: true,
    })
  );

  walls.push(
    Bodies.rectangle(W / 2, -t / 2, W, t, {
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

  // Camera
  video = createCapture(VIDEO);

  video.size(W, H);

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
  // CAMERA
  push();

  translate(W, 0);
  scale(-1, 1);

  image(video, 0, 0);

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
  if (ball.position.y > H + 120) {
    state = "lose";

    loseStartTime = millis();

    bestScore = max(bestScore, score);
  }

  // Danger line
  stroke(255, 0, 0);
  strokeWeight(4);

  line(0, H - 20, W, H - 20);

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

  for (let hand of predictions) {
    for (let i of tipIndexes) {
      if (bodyIndex >= handBodies.length) return;

      let kp = hand.keypoints[i];

      Body.setPosition(handBodies[bodyIndex], {
        x: W - kp.x,
        y: kp.y,
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
  for (let hand of predictions) {
    for (let kp of hand.keypoints) {
      fill(0, 255, 255);

      noStroke();

      circle(W - kp.x, kp.y, 12);
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
    x: W / 2,
    y: H / 3,
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

  text("BALLOON KEEPY UPPY", W / 2, H / 2 - 120);

  textSize(28);

  text("Show your hand to start", W / 2, H / 2);

  textSize(22);

  text("Hit the balloon with your fingertips", W / 2, H / 2 + 60);

  text("Higher levels = stronger wind", W / 2, H / 2 + 100);
}

function drawLoseScreen() {
  background(20, 0, 0);

  textAlign(CENTER);

  fill(255, 80, 80);

  textSize(72);

  text("YOU LOST", W / 2, H / 2 - 120);

  fill(255);

  textSize(36);

  text("Score: " + score, W / 2, H / 2 - 20);

  text("Best: " + bestScore, W / 2, H / 2 + 40);

  textSize(24);

  text("Returning to start...", W / 2, H / 2 + 120);
}
