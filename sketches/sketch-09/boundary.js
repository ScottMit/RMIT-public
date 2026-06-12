class Boundary extends Body {
  constructor(x, y, w, h, a) {
    super();
    let options = {
      friction: 0.1,
      restitution: 0.5,
      angle: a,
      isStatic: true
    };
    this.col = color(200,200,200);
    this.body = Bodies.rectangle(x, y, w, h, options);
    // add the body to the world
    Composite.add(engine.world, [this.body]);
  }
}
