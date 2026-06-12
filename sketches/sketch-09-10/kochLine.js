class KochLine {
  constructor(posV, lineV) {
    this.p = posV.copy();
    this.l = lineV.copy();
    this.body;
  }

  generate() {
    let mag = this.l.mag();

    // calculate vectors for four more lines
    let p1 = p5.Vector.copy(this.p);
    let l1 = p5.Vector.copy(this.l);
    l1.setMag(mag / 3);

    let p2 = p5.Vector.add(this.p, l1);
    let l2 = p5.Vector.copy(l1);
    l2.rotate(-PI / 3);

    let p3 = p5.Vector.add(p2, l2);
    let l3 = p5.Vector.copy(l2);
    l3.rotate((2 * PI) / 3);

    let p4 = p5.Vector.add(p3, l3);
    let l4 = p5.Vector.copy(l1);

    return [p1, l1, p2, l2, p3, l3, p4, l4];
  }

  makeBody() {
    // calculate centre of line
    let theLine = p5.Vector.copy(this.l);
    let mag = theLine.mag();
    theLine.mult(0.5);
    let lineCentre = p5.Vector.add(this.p, theLine);
    let options = {
      friction: 0.5,
      restitution: 0.5,
      angle: this.l.heading(),
      isStatic: true,
    };
    this.body = Bodies.rectangle(lineCentre.x, lineCentre.y, mag, 1, options);
    Composite.add(engine.world, [this.body]);
  }

  makeDynamic() {
    Body.setMass(this.body, 0.1);
    Body.setStatic(this.body, false);
  }

  show() {
    let endPoint = p5.Vector.add(this.p, this.l);
    stroke(58, 144, 97);
    noFill();
    beginShape();
    for (let a of this.body.vertices) {
      vertex(a.x, a.y);
    }
    endShape();
  }
}
