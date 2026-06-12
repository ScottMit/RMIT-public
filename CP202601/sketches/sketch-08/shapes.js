/// ============================================
/// DROP OBJECT FUNCTIONS
/// ============================================

function dropCircle(x, y) {
  let radius = FIXED_CIRCLE_R;
  let ball = Bodies.circle(x, y, radius, {
    restitution: 0.45,
    friction: 0.02,
    density: 0.006,
    label: 'circle'
  });
  Body.setAngularVelocity(ball, 0);
  World.add(world, ball);
  balls.push(ball);
  return ball;
}

function dropSquare(x, y) {
  let size = FIXED_SQUARE_S;
  let sq = Bodies.rectangle(x, y, size, size, {
    restitution: 1.2,
    friction: 0.02,
    density: 0.009,
    label: 'square'
  });
  Body.setAngularVelocity(sq, 0);
  World.add(world, sq);
  balls.push(sq);
  return sq;
}

function dropTriangle(x, y) {
  let s = FIXED_TRI_S;
  let tri = Bodies.polygon(x, y, 3, s, {
    restitution: 0.32,
    friction: 0.02,
    density: 0.009,
    label: 'triangle'
  });
  Body.setAngularVelocity(tri, 0);
  World.add(world, tri);
  balls.push(tri);
  return tri;
}

/// Spawns shape in order to match drops

function spawnShapeByType(shapeType, x, y) {
  if (shapeType === 'circle') {
    dropCircle(x, y);
  } else if (shapeType === 'square') {
    dropSquare(x, y);
  } else if (shapeType === 'triangle') {
    dropTriangle(x, y);
  }
}



/// ============================================
/// CONSTANTS
/// ============================================

let FIXED_CIRCLE_R = 4;
let FIXED_SQUARE_S = 8;
let FIXED_TRI_S = 22 / 3;

