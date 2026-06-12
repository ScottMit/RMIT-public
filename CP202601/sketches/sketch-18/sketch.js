// =====================================
// BODYPOSE VARIABLES
// =====================================

let video;
let bodyPose;
let poses = [];
let connections;

let gesture = "LOADING...";
let duckLineY = 260;
let lastGesture = "";

let clapDetected = false;

// =====================================
// GAME STATE
// =====================================

let showInstructions = true;

// =====================================
// PLAYER
// =====================================

let playerLane = 1;

let playerY = 520;
let jumpVelocity = 0;
let gravity = 0.8;

let isJumping = false;
let isDucking = false;

// =====================================
// GAME
// =====================================

let obstacles = [];

let score = 0;
let gameOver = false;

let spawnTimer = 0;
let spawnInterval = 80;

// =====================================
// ROAD CONSTANTS
// =====================================

const GAME_HEIGHT = 600;

const HORIZON_Y = 120;
const PLAYER_Y = 520;

const ROAD_TOP_LEFT = 360;
const ROAD_TOP_RIGHT = 440;

const ROAD_BOTTOM_LEFT = 120;
const ROAD_BOTTOM_RIGHT = 680;

// =====================================
// PRELOAD
// =====================================

function preload() {
  bodyPose = ml5.bodyPose();
}

// =====================================
// SETUP
// =====================================

function setup() {

  createCanvas(800, 1200);

  textFont("Arial");

  video = createCapture(VIDEO);

  video.size(640, 480);

  video.hide();

  bodyPose.detectStart(
    video,
    gotPoses
  );

  connections =
    bodyPose.getSkeleton();
}

// =====================================
// DRAW
// =====================================

function draw() {

  if (showInstructions) {

    drawInstructions();

    return;
  }

  background(5, 10, 20);

  drawRoad();

  if (!gameOver) {

    controlPlayerWithGestures();

    updatePlayer();

    spawnTimer++;

    if (
      spawnTimer >=
      spawnInterval
    ) {

      spawnObstacle();

      spawnTimer = 0;
    }

    updateObstacles();

    score++;
  }

  drawPlayer();

  drawUI();

  drawCameraPreview();
}

// =====================================
// BODYPOSE
// =====================================

function gotPoses(results) {
  poses = results;
}

function detectGesture() {

  if (poses.length === 0) {

    gesture = "NO PERSON";

    return;
  }

  let pose = poses[0];

  let nose =
    pose.keypoints[0];

  let leftShoulder =
    pose.keypoints[5];

  let rightShoulder =
    pose.keypoints[6];

  let leftWrist =
    pose.keypoints[9];

  let rightWrist =
    pose.keypoints[10];

  let handDistance = dist(
    leftWrist.x,
    leftWrist.y,
    rightWrist.x,
    rightWrist.y
  );

  // CLAP RESTART

  if (
    gameOver &&
    handDistance < 50
  ) {

    gesture = "CLAP";

    if (!clapDetected) {

      restartGame();

      clapDetected = true;
    }

    return;
  }

  if (handDistance > 80) {

    clapDetected = false;
  }

  // DUCK

  if (nose.y > duckLineY) {

    gesture = "DUCK";

    return;
  }

  // JUMP

  if (
    leftWrist.y <
      leftShoulder.y &&
    rightWrist.y <
      rightShoulder.y
  ) {

    gesture = "JUMP";

    return;
  }

  // LEAN

  let leftHip =
    pose.keypoints[11];

  let rightHip =
    pose.keypoints[12];

  let hipCenterX =
    (
      leftHip.x +
      rightHip.x
    ) / 2;

  let bodyLean =
    nose.x -
    hipCenterX;

  // mirrored

  if (bodyLean < -40) {

    gesture =
      "MOVE RIGHT";

    return;
  }

  if (bodyLean > 40) {

    gesture =
      "MOVE LEFT";

    return;
  }

  gesture = "RUNNING";
}

function controlPlayerWithGestures() {

  detectGesture();

  if (
    gesture ===
      "MOVE LEFT" &&
    lastGesture !==
      "MOVE LEFT"
  ) {

    playerLane--;

    playerLane =
      constrain(
        playerLane,
        0,
        2
      );
  }

  if (
    gesture ===
      "MOVE RIGHT" &&
    lastGesture !==
      "MOVE RIGHT"
  ) {

    playerLane++;

    playerLane =
      constrain(
        playerLane,
        0,
        2
      );
  }

  if (
    gesture ===
      "JUMP" &&
    !isJumping
  ) {

    jumpVelocity = -15;

    isJumping = true;
  }

  isDucking =
    gesture === "DUCK";

  lastGesture = gesture;
}
// =====================================
// ROAD
// =====================================

function drawRoad() {

  // Horizon glow

  for (let i = 0; i < 10; i++) {

    stroke(
      0,
      255,
      255,
      20
    );

    line(
      ROAD_TOP_LEFT -
        i * 20,
      HORIZON_Y,
      ROAD_TOP_RIGHT +
        i * 20,
      HORIZON_Y
    );
  }

  // Grid

  for (
    let z = 0.05;
    z < 1;
    z += 0.08
  ) {

    let y = lerp(
      HORIZON_Y,
      GAME_HEIGHT,
      z * z
    );

    let left = lerp(
      ROAD_TOP_LEFT,
      ROAD_BOTTOM_LEFT,
      z
    );

    let right = lerp(
      ROAD_TOP_RIGHT,
      ROAD_BOTTOM_RIGHT,
      z
    );

    stroke(
      0,
      255,
      255,
      50
    );

    strokeWeight(1);

    line(
      left,
      y,
      right,
      y
    );
  }

  stroke(0,255,255);
  strokeWeight(2);

  // edges

  line(
    ROAD_TOP_LEFT,
    HORIZON_Y,
    ROAD_BOTTOM_LEFT,
    GAME_HEIGHT
  );

  line(
    ROAD_TOP_RIGHT,
    HORIZON_Y,
    ROAD_BOTTOM_RIGHT,
    GAME_HEIGHT
  );

  // lane dividers

  line(
    lerp(
      ROAD_TOP_LEFT,
      ROAD_TOP_RIGHT,
      1/3
    ),
    HORIZON_Y,
    lerp(
      ROAD_BOTTOM_LEFT,
      ROAD_BOTTOM_RIGHT,
      1/3
    ),
    GAME_HEIGHT
  );

  line(
    lerp(
      ROAD_TOP_LEFT,
      ROAD_TOP_RIGHT,
      2/3
    ),
    HORIZON_Y,
    lerp(
      ROAD_BOTTOM_LEFT,
      ROAD_BOTTOM_RIGHT,
      2/3
    ),
    GAME_HEIGHT
  );

  line(
    ROAD_TOP_LEFT,
    HORIZON_Y,
    ROAD_TOP_RIGHT,
    HORIZON_Y
  );
}

// =====================================
// PLAYER
// =====================================

function updatePlayer() {

  playerY +=
    jumpVelocity;

  jumpVelocity +=
    gravity;

  if (
    playerY >=
    PLAYER_Y
  ) {

    playerY =
      PLAYER_Y;

    jumpVelocity = 0;

    isJumping = false;
  }
}

function drawPlayer() {

  let laneWidthBottom =

    (
      ROAD_BOTTOM_RIGHT -
      ROAD_BOTTOM_LEFT
    ) / 3;

  let x =

    ROAD_BOTTOM_LEFT +

    laneWidthBottom *
      playerLane +

    laneWidthBottom / 2;

  let radius =
    isDucking
      ? 16
      : 22;

  noStroke();

  // glow

  fill(
    0,
    255,
    255,
    20
  );

  circle(
    x,
    playerY,
    radius * 4
  );

  fill(
    0,
    255,
    255,
    40
  );

  circle(
    x,
    playerY,
    radius * 3
  );

  fill(
    0,
    255,
    255,
    80
  );

  circle(
    x,
    playerY,
    radius * 2.2
  );

  // core

  fill(255);

  circle(
    x,
    playerY,
    radius
  );

  fill(
    0,
    255,
    255
  );

  circle(
    x,
    playerY,
    radius * 0.5
  );
}

// =====================================
// OBSTACLES
// =====================================

function spawnObstacle() {

  let types = [

    "avoid",
    "jump",
    "duck"

  ];

  obstacles.push({

    lane:
      floor(
        random(3)
      ),

    depth: 0,

    type:
      random(types)
  });
}

// =====================================
// WIREFRAME BOX
// =====================================

function drawWireframeBox(
  x,
  y,
  w,
  h,
  lane,
  col
) {

  let laneHorizonX =

    ROAD_TOP_LEFT +

    (
      ROAD_TOP_RIGHT -
      ROAD_TOP_LEFT
    )

    *

    (
      (
        lane + 0.5
      ) / 3
    );

  let extrusion =
    0.18;

  let backX =
    lerp(
      x,
      laneHorizonX,
      extrusion
    );

  let backY =
    lerp(
      y,
      HORIZON_Y,
      extrusion
    );

  let backW =
    w * 0.7;

  let backH =
    h * 0.7;

  noFill();

  // glow pass

  stroke(
    red(col),
    green(col),
    blue(col),
    40
  );

  strokeWeight(8);

  drawPerspectiveBox(

    x,
    y,
    w,
    h,

    backX,
    backY,

    backW,
    backH

  );

  // main lines

  stroke(col);

  strokeWeight(2);

  drawPerspectiveBox(

    x,
    y,
    w,
    h,

    backX,
    backY,

    backW,
    backH

  );
}

function drawPerspectiveBox(

  fx,
  fy,
  fw,
  fh,

  bx,
  by,
  bw,
  bh

) {

  rectMode(CENTER);

  // front

  rect(
    fx,
    fy,
    fw,
    fh
  );

  // back

  rect(
    bx,
    by,
    bw,
    bh
  );

  // connectors

  line(
    fx - fw/2,
    fy - fh/2,

    bx - bw/2,
    by - bh/2
  );

  line(
    fx + fw/2,
    fy - fh/2,

    bx + bw/2,
    by - bh/2
  );

  line(
    fx - fw/2,
    fy + fh/2,

    bx - bw/2,
    by + bh/2
  );

  line(
    fx + fw/2,
    fy + fh/2,

    bx + bw/2,
    by + bh/2
  );
}
// =====================================
// OBSTACLE UPDATE
// =====================================

function updateObstacles() {

  for (
    let i =
      obstacles.length - 1;
    i >= 0;
    i--
  ) {

    let obstacle =
      obstacles[i];

    obstacle.depth +=
      0.01;

    let d =
      obstacle.depth;

    let leftEdge =
      lerp(
        ROAD_TOP_LEFT,
        ROAD_BOTTOM_LEFT,
        d
      );

    let rightEdge =
      lerp(
        ROAD_TOP_RIGHT,
        ROAD_BOTTOM_RIGHT,
        d
      );

    let roadWidth =
      rightEdge -
      leftEdge;

    let laneWidth =
      roadWidth / 3;

    let x =
      leftEdge +
      laneWidth *
        obstacle.lane +
      laneWidth / 2;

    let y =
      lerp(
        HORIZON_Y,
        PLAYER_Y,
        d
      );

    let size =
      lerp(
        5,
        140,
        d
      );

    if (
      obstacle.type ===
      "avoid"
    ) {

      drawWireframeBox(
        x,
        y,
        size,
        size,
        obstacle.lane,
        color(
          255,
          150,
          0
        )
      );

    } else if (
      obstacle.type ===
      "jump"
    ) {

      drawWireframeBox(
        x,
        y + size * 0.25,
        size,
        size * 0.5,
        obstacle.lane,
        color(
          0,
          255,
          100
        )
      );

    } else {

      drawWireframeBox(
        x,
        y - size,
        size * 1.3,
        size * 0.4,
        obstacle.lane,
        color(
          0,
          180,
          255
        )
      );
    }

    if (d >= 0.95) {

      let playerJumped =
        playerY <
        PLAYER_Y - 50;

      let hit = false;

      if (
        obstacle.type ===
          "avoid" &&
        obstacle.lane ===
          playerLane
      ) {
        hit = true;
      }

      if (
        obstacle.type ===
          "jump" &&
        obstacle.lane ===
          playerLane &&
        !playerJumped
      ) {
        hit = true;
      }

      if (
        obstacle.type ===
          "duck" &&
        obstacle.lane ===
          playerLane &&
        !isDucking
      ) {
        hit = true;
      }

      if (hit) {

        gameOver = true;
      }

      obstacles.splice(
        i,
        1
      );
    }
  }
}

// =====================================
// UI
// =====================================

function drawUI() {

  fill(255);

  noStroke();

  textAlign(LEFT);

  textSize(24);

  text(
    "Score: " +
      score,
    20,
    40
  );

  textSize(18);

  text(
    "Gesture: " +
      gesture,
    20,
    70
  );

  if (gameOver) {

    textAlign(
      CENTER
    );

    fill(
      255,
      50,
      50
    );

    textSize(60);

    text(
      "GAME OVER",
      width / 2,
      height / 2
    );

    fill(255);

    textSize(24);

    text(
      "CLAP TO RESTART",
      width / 2,
      height / 2 + 60
    );
  }
}

// =====================================
// INSTRUCTION SCREEN
// =====================================

function drawInstructions() {

  background(0);

  textAlign(CENTER);

  fill(0,255,255);

  textSize(60);

  text(
    "OUTLAST",
    width / 2,
    100
  );

  text(
    "THE CUBES",
    width / 2,
    170
  );

  textSize(30);

  text(
    "SURVIVAL GUIDE",
    width / 2,
    260
  );

  fill(255);

  textSize(22);

  text(
    "Lean LEFT = Move Left Lane",
    width / 2,
    340
  );

  text(
    "Lean RIGHT = Move Right Lane",
    width / 2,
    390
  );

  text(
    "Raise Both Hands = Jump",
    width / 2,
    440
  );

  text(
    "Lower Head Below Blue Line = Duck",
    width / 2,
    490
  );

  text(
    "Orange Cube = Change Lane",
    width / 2,
    560
  );

  text(
    "Green Cube = Jump",
    width / 2,
    610
  );

  text(
    "Blue Cube = Duck",
    width / 2,
    660
  );

  fill(0,255,255);

  textSize(30);

  text(
    "PRESS ENTER TO START",
    width / 2,
    780
  );
}

// =====================================
// CAMERA
// =====================================

function drawCameraPreview() {

  push();

  translate(
    width,
    600
  );

  scale(-1,1);

  image(
    video,
    0,
    0,
    width,
    600
  );

  let scaleX =
    width / 640;

  let scaleY =
    600 / 480;

  for (
    let pose of poses
  ) {

    for (
      let connection
      of connections
    ) {

      let a =
        pose.keypoints[
          connection[0]
        ];

      let b =
        pose.keypoints[
          connection[1]
        ];

      stroke(
        0,
        255,
        255
      );

      strokeWeight(2);

      line(
        a.x * scaleX,
        a.y * scaleY,
        b.x * scaleX,
        b.y * scaleY
      );
    }

    for (
      let point
      of pose.keypoints
    ) {

      fill(
        0,
        255,
        255
      );

      noStroke();

      circle(
        point.x *
          scaleX,
        point.y *
          scaleY,
        12
      );
    }
  }

  pop();

  // DUCK LINE

  let scaledDuckLine =
    map(
      duckLineY,
      0,
      480,
      600,
      1200
    );

  stroke(
    0,
    150,
    255
  );

  strokeWeight(3);

  line(
    0,
    scaledDuckLine,
    width,
    scaledDuckLine
  );

  fill(255);

  noStroke();

  textAlign(CENTER);

  textSize(40);

  text(
    gesture,
    width / 2,
    640
  );
}

// =====================================
// KEYS
// =====================================

function keyPressed() {

  if (
    showInstructions &&
    keyCode === ENTER
  ) {

    showInstructions =
      false;
  }
}

// =====================================
// RESTART
// =====================================

function restartGame() {

  playerLane = 1;

  playerY =
    PLAYER_Y;

  jumpVelocity = 0;

  isJumping = false;

  isDucking = false;

  obstacles = [];

  score = 0;

  spawnTimer = 0;

  gameOver = false;
}