let particles = [];

function setup() {
  createCanvas(windowWidth, windowHeight);

  background(5, 10, 20);

  for (let i = 0; i < 2500; i++) {
    particles.push(new Particle());
  }
}

function draw() {
  fill(0, 8);
  noStroke();
  rect(0, 0, width, height);

  for (let p of particles) {
    p.update();
    p.display();
  }
}

class Particle {
  constructor() {
    this.pos = createVector(random(width), random(height));

    this.prev = this.pos.copy();
    this.vel = createVector();
  }

  update() {
    this.prev = this.pos.copy();

    let scale = 0.002;

    let angle =
      noise(this.pos.x * scale, this.pos.y * scale, frameCount * 0.001) *
      TWO_PI *
      8;

    let flow = p5.Vector.fromAngle(angle);

    flow.mult(1.2);

    let mouse = createVector(mouseX, mouseY);

    let magnetic = p5.Vector.sub(mouse, this.pos);

    let d = magnetic.mag();

    if (d < 250) {
      let strength = map(d, 0, 250, 2, 0);

      magnetic.setMag(strength);

      flow.add(magnetic);
    }

    this.vel.lerp(flow, 0.08);

    this.pos.add(this.vel);

    if (
      this.pos.x < 0 ||
      this.pos.x > width ||
      this.pos.y < 0 ||
      this.pos.y > height
    ) {
      this.pos.set(random(width), random(height));

      this.prev = this.pos.copy();
    }
  }
  display() {
    let speed = this.vel.mag();

    let t = constrain(speed / 3, 0, 1);

    let mr = 255;
    let mg = 0;
    let mb = 200;

    let cr = 0;
    let cg = 255;
    let cb = 255;

    let r = lerp(mr, cr, t);
    let g = lerp(mg, cg, t);
    let b = lerp(mb, cb, t);

    stroke(r, g, b, 25);

    line(this.prev.x, this.prev.y, this.pos.x, this.pos.y);
  }
}
