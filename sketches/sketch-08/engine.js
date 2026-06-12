  /// creates engine
let Engine = Matter.Engine,
    World = Matter.World,
    Bodies = Matter.Bodies,
    Body = Matter.Body,
    Events = Matter.Events;

let engine, world;
let ground;
let leftWall, rightWall;
let balls = [];
let nextDropType = 0;

  ///creates canvas and loads engine and makes Boundaries

function setup() {
  createCanvas(windowWidth, windowHeight);
  engine = Engine.create({
    positionIteration: 2,
    velocityIteration: 2
  });
  world = engine.world;
  engine.gravity.y = 1;

  /// Create bounaries
  /// Ground has been disable in world.add
  
  let thickness = 20;
  ground = Bodies.rectangle(width/2, height + thickness/2 - 40/3, width, 20, { isStatic: true, friction: 0.2, label: 'ground' });
  leftWall = Bodies.rectangle(-thickness/2, height/2, thickness, height, { isStatic: true, label: 'wall' });
  rightWall = Bodies.rectangle(width + thickness/2, height/2, thickness, height, { isStatic: true, label: 'wall' });
  World.add(world, [leftWall, rightWall]);

  /// loads Pegs.js 
  
  createPegs(world);

  /// Collison detection
  
  Events.on(engine, 'collisionStart', function(event) {
    for (let pair of event.pairs) {
      handleCollisionPair(pair.bodyA, pair.bodyB);
      handleCollisionPair(pair.bodyB, pair.bodyA);
    }
  });
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}