let video;
let handPose;
let predictions = [];
let particles = [];

function preload() {
  handPose = ml5.handPose();
}

function gotResults(results) {
  predictions = results;
  
}

function setup() {
  createCanvas(windowWidth, windowHeight);

  video = createCapture(VIDEO);
  video.size(windowWidth, windowHeight);
  video.hide();

  colorMode(HSB, 360, 100, 100, 255);

  handPose.detectStart(video, gotResults);
}

function draw() {
  translate(width, 0);
  scale(-1, 1);
  image(video, 0, 0);

  for (let hand of predictions) {
    if (hand.confidence > 0.95) {
      let finger = hand.keypoints[8];

      if (frameCount % 1 == 0)
        if (particles.length < 800) {
          particles.push(new Particle(finger.x, finger.y));
        }
    }
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    particles[i].display();

    if (particles[i].isFinished()) {
      particles.splice(i, 1);
    }
  }

  translate(width, 0);
  scale(-1, 1);
  fill(255);
  text("Particles: " + particles.length, 10, 20);
}

class Particle {
  constructor(x, y) {
    this.x = x;
    this.y = y;

    this.size = random(8, 25);

    this.vx = random(-0.3, 0.3);
    this.vy = random(-0.3, 0.3);

    this.lifespan = 255;
    this.alpha = this.lifespan;

    this.hue = frameCount % 360;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;

    this.vx *= 0.98;
    this.vy *= 0.98;

    this.lifespan -= 1;
    this.alpha = this.lifespan;
  }

  display() {
    noStroke();

    fill(this.hue, 100, 100, this.alpha);

    ellipse(this.x, this.y, this.size);
  }

  isFinished() {
    return this.lifespan <= 0;
  }
}
