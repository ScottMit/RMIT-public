
/// ============================================
/// COLLISION HANDLING
/// ============================================

function handleCollisionPair(a, b) {
  

  
  
  ///========================================================
  // Square colliding with pegs
  if (a.label === 'square' && (b.label === 'peg' || b.label === 'peg_dynamic')) {
  if (Math.random() < 0.8) {
    engagePegById(b, world, { respawnMs: 5000 });
    applyRandomBounce(a, 0.1);
  }
}

  ///========================================================
  /// Peg colliding with circle or triangle
  
  
  if ((a.label === 'peg' || a.label === 'peg_dynamic') && b) {
    if (b.label === 'circle') {
      if (Math.random() < 0.6) engagePegById(a, world, { respawnMs: 5000 });
      else markPegInactive(a.id, 300);
      return;
    }

    if (b.label === 'triangle') {
      if (Math.random() < 0.80) {
        let impulse = createRandomImpulse(0.02, 0.03);
        engagePegById(a, world, { impulseVec: impulse, respawnMs: 5000 });
      } else markPegInactive(a.id, 300);
      return;
    }
  }
}

///========================================================
/// Square bounce

function applyRandomBounce(body, magnitude) {
  let mag = Math.random() * magnitude;
  let ang = Math.random() * Math.PI * 2;
  let impulse = { x: Math.cos(ang) * mag, y: Math.sin(ang) * mag };
  Body.applyForce(body, body.position, impulse);
}

/// Triangle bounce

function createRandomImpulse(minMag, maxMag) {
  let mag = (minMag + Math.random() * maxMag) * 1;
  let ang = Math.random() * Math.PI * 2;
  return { x: Math.cos(ang) * mag, y: Math.sin(ang) * mag };
}

/// ============================================
/// DRAW FUNCTIONS
/// ============================================

function draw() {
  background(30);
  Engine.update(engine, 1000 / 60);

  drawPegs();
  drawBalls();
  //drawGround();
  cleanupBalls();
  drawUI();
}

/// Draw Pegs

function drawPegs() {
  noStroke();
  for (let p of pegs) {
    if (!p) continue;
    let meta = pegMap.get(p.id) || pegMap.get(p.originalId) || {};
    // Color rules:
    // - Static peg= true orange
    // - Otherwise inactive = yellow
    let isActiveStatic = p.label === 'peg' && meta.active !== false;
    let fillColor = isActiveStatic ? [200, 120, 40] : [255, 255, 0];

    push();
    translate(p.position.x, p.position.y);
    rotate(p.angle || 0);
    fill(...fillColor);
    ellipse(0, 0, (p.circleRadius || pegRadius) * 2);
    pop();
  }
}

/// Draws all Shapes

function drawBalls() {
  for (let b of balls) {
    if (!b) continue;
    push();
    translate(b.position.x, b.position.y);
    rotate(b.angle || 0);
    noStroke();

    if (b.label === 'circle') {
      fill(100, 200, 255);
      ellipse(0, 0, (b.circleRadius || (12 / 3)) * 2);
    } else if (b.label === 'square') {
      fill(180, 90, 200);
      rectMode(CENTER);
      rect(0, 0, Math.max(6, b.bounds.max.x - b.bounds.min.x), Math.max(6, b.bounds.max.y - b.bounds.min.y));
    } else if (b.label === 'triangle') {
      fill(120, 240, 140);
      beginShape();
      for (let v of b.vertices) vertex(v.x - b.position.x, v.y - b.position.y);
      endShape(CLOSE);
    }

    pop();
  }
}

function drawGround() {
  noStroke();
  fill(100);
  push();
  translate(ground.position.x, ground.position.y);
  rectMode(CENTER);
  rect(0, 0, ground.bounds.max.x - ground.bounds.min.x, ground.bounds.max.y - ground.bounds.min.y);
  pop();
}

///TEXT ON SCREEN

function drawUI() {
  noStroke();
  fill(255);
  textSize(14);
  text("Touch Screen to drop Shapes", 12, 20);
}

/// ============================================
/// PHYSICS & CLEANUP
/// ============================================

function cleanupBalls() {
  for (let i = balls.length - 1; i >= 0; i--) {
    if (!balls[i]) {
      balls.splice(i, 1);
      continue;
    }
    if (balls[i].position.y > height + 300) {
      let fallenBall = balls[i];
      let shapeType = fallenBall.label;
      
/// Spawn a new shape above the canvas with random x position
      
      let randomX = random(50, width - 50);
      spawnShapeByType(shapeType, randomX, -50);
      
      try {
        World.remove(world, fallenBall);
      } catch (e) {}
      balls.splice(i, 1);
    }
  }
}


function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  
  // Remove old pegs
  for (let peg of pegs) {
    try {
      World.remove(world, peg);
    } catch (e) {}
  }
  pegs = [];
  pegMap.clear();
  
  // Recreate pegs with new canvas size
  createPegs(world);
}