class Chain {
  constructor(balls) {
    this.balls = balls;
  }

  show() {
    for (let b of this.balls){
      b.show();
    }
  }
}
