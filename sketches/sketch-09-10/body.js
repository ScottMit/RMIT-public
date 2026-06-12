class Body {
  constructor() {
    // all construction in done in child objects
  }

  isOffScreen() {
    if (this.body.position.y > height + 100) {
      return true;
    } else {
      return false;
    }
  }

  remove() {
    Composite.remove(engine.world, this.body);
  }

  show() {
    noStroke();
    fill(this.col);
    beginShape();
    for (let a of this.body.vertices) {
      vertex(a.x, a.y);
    }
    endShape(CLOSE);
  }
}
