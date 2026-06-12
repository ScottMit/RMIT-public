class Ball extends Body {
  constructor(x, y, r, fixed, col) {
    super();
    let options = {
      friction: 0.5,
      frictionAir: 0.002,
      restitution: 0.5,
      density: 0.004,
      isStatic: fixed,
    };
    
    this.col = col || color(147, 112, 219);

    this.body = Bodies.circle(x, y, r, options);
    // add the body to the world
    Composite.add(engine.world, [this.body]);
  }

  show() {
    let pos = this.body.position;
    let r = this.body.circleRadius;
    push();
    translate(pos.x, pos.y);
    noStroke();
    fill(this.col);
    ellipseMode(CENTER);
    ellipse(0, 0, r * 2);
    pop();
  }
}
