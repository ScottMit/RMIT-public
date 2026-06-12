/// Pegs Settings

let pegs = [];
let pegMap = new Map();
let pegSpacing = 20;
let pegRadius = 8 / 3;


/// Creates the Pegs Pattern on the canva

function createPegs(world) {
  let paddingX = 20;
  let startY = 50;
  let usableWidth = width - paddingX * 2;
  let usableHeight = height - startY - 200 / 3;
  let rows = Math.max(4, Math.floor(usableHeight / (pegSpacing * 0.85)));
  let cols = Math.max(5, Math.floor(usableWidth / pegSpacing) + 1);

  for (let row = 0; row < rows; row++) {
    let offset = (row % 2) * (pegSpacing / 2);
    for (let col = 0; col < cols; col++) {
      let x = paddingX + col * pegSpacing + offset;
      let y = startY + row * (pegSpacing * 0.85);
      let peg = Matter.Bodies.circle(x, y, pegRadius, {
        isStatic: true,
        restitution: 0.5,
        friction: 0.0,
        label: 'peg'
      });
      Matter.World.add(world, peg);
      pegs.push(peg);
      pegMap.set(peg.id, { x: x, y: y, r: pegRadius, active: true, constraint: null });
    }
  }
}

/// respawns pegs if return as false

function markPegInactive(id, ms = 500) {
  let m = pegMap.get(id);
  if (!m) return false;
  m.active = false;
  setTimeout(() => {
    let mm = pegMap.get(id);
    if (mm) mm.active = true;
  }, ms);
  return true;
}

///converts static pegs to dynamic when hit

function engagePegById(pegBody, world, options = {}) {
  let meta = pegMap.get(pegBody.id) || pegMap.get(pegBody.originalId);
  if (!meta || !meta.active) return;
  if (!markPegInactive(pegBody.id, options.respawnMs || 5000)) return;

  try { Matter.World.remove(world, pegBody); } catch (e) {}
  let dyn = Matter.Bodies.circle(meta.x, meta.y, meta.r, {
    isStatic: false,
    restitution: 0.25,
    friction: 0.4,
    density: 0.004 * 3,
    label: 'peg_dynamic'
  });
  Matter.World.add(world, dyn);

  if (options.impulseVec) Matter.Body.applyForce(dyn, dyn.position, options.impulseVec);
  else Matter.Body.setAngularVelocity(dyn, (Math.random() - 0.5) * 0.5);

  pegMap.set(dyn.id, { x: meta.x, y: meta.y, r: meta.r, originalId: pegBody.id, active: false, scheduled: true, constraint: null });

  respawnPeg(dyn, world, options.respawnMs || 5000);

  let idx = pegs.findIndex(p => p.id === pegBody.id);
  if (idx !== -1) pegs[idx] = dyn;
  else pegs.push(dyn);
}

/// converts back to static peg

function respawnPeg(dynamicPeg, world, delayMs = 5000) {
  setTimeout(() => {
    let info = pegMap.get(dynamicPeg.id) || pegMap.get(dynamicPeg.originalId);
    if (!info) return;
    if (info.constraint) {
      try { Matter.World.remove(world, info.constraint); } catch (e) {}
      info.constraint = null;
    }
    try { Matter.World.remove(world, dynamicPeg); } catch (e) {}
    let newPeg = Matter.Bodies.circle(info.x, info.y, info.r, {
      isStatic: true,
      restitution: 0.5,
      friction: 0.0,
      label: 'peg'
    });
    Matter.World.add(world, newPeg);
    let idx = pegs.findIndex(p => p.id === dynamicPeg.id || p.id === dynamicPeg.originalId);
    if (idx !== -1) pegs[idx] = newPeg;
    else pegs.push(newPeg);
    pegMap.delete(dynamicPeg.id);
    pegMap.set(newPeg.id, { x: info.x, y: info.y, r: info.r, active: true, constraint: null });
  }, delayMs);
}
