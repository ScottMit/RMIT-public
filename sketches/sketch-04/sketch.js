let vertices = [];
let faces = [];
let modelLoaded = false;
let slider;
let molds = [];
let lastCutoff = -1;
let pheromone = [];

let sensorDistance = 0.2;
let sensorAngle = 45;
let rotateAngle = 45;
let trailDecay = 5;
let numAgents = 50;
const MAX_TRAIL_LENGTH = 1000;

function preload() {
  loadStrings("UVSphere200.obj", parseOBJ);
}

function parseOBJ(lines) {
  for (let line of lines) {
    let parts = line.trim().split(/\s+/);
    if (parts[0] === "v") {
      vertices.push([
        parseFloat(parts[1]),
        parseFloat(parts[2]),
        parseFloat(parts[3]),
      ]);
    } else if (parts[0] === "f") {
      faces.push(parts.slice(1).map((p) => parseInt(p.split("/")[0]) - 1));
      {
        pheromone = new Array(faces.length).fill(0);
      }
    }
  }
  console.log("Vertices:", vertices.length, "Faces:", faces.length);
  modelLoaded = true;
}
{
  pheromone = new Array(faces.length).fill(0);
}
// ─────────────────────────────────────────
// GEOMETRY
// ─────────────────────────────────────────

function dot3(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross3(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function normalize3(v) {
  let mag = sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2);
  if (mag === 0) return [0, 0, 1];
  return [v[0] / mag, v[1] / mag, v[2] / mag];
}

function getMeshNormal(point) {
  // Find the nearest face and return its normal
  let bestDist = Infinity;
  let bestFace = null;
  for (let face of faces) {
    let a = vertices[face[0]];
    let b = vertices[face[1]];
    let c = vertices[face[2]];
    if (!a || !b || !c) continue;
    let cx = (a[0] + b[0] + c[0]) / 3;
    let cy = (a[1] + b[1] + c[1]) / 3;
    let cz = (a[2] + b[2] + c[2]) / 3;
    let dx = point[0] - cx,
      dy = point[1] - cy,
      dz = point[2] - cz;
    let d = dx * dx + dy * dy + dz * dz;
    if (d < bestDist) {
      bestDist = d;
      bestFace = face;
    }
  }
  if (!bestFace) return [0, 1, 0];
  let a = vertices[bestFace[0]];
  let b = vertices[bestFace[1]];
  let c = vertices[bestFace[2]];
  let ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  let ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  return normalize3(cross3(ab, ac));
}

function closestPointOnTriangle(p, a, b, c) {
  let ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  let ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  let ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];

  let d1 = dot3(ab, ap);
  let d2 = dot3(ac, ap);
  if (d1 <= 0 && d2 <= 0) return [...a];

  let bp = [p[0] - b[0], p[1] - b[1], p[2] - b[2]];
  let d3 = dot3(ab, bp);
  let d4 = dot3(ac, bp);
  if (d3 >= 0 && d4 <= d3) return [...b];

  let cp = [p[0] - c[0], p[1] - c[1], p[2] - c[2]];
  let d5 = dot3(ab, cp);
  let d6 = dot3(ac, cp);
  if (d6 >= 0 && d5 <= d6) return [...c];

  let vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) {
    let v = d1 / (d1 - d3);
    return [a[0] + v * ab[0], a[1] + v * ab[1], a[2] + v * ab[2]];
  }

  let vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) {
    let w = d2 / (d2 - d6);
    return [a[0] + w * ac[0], a[1] + w * ac[1], a[2] + w * ac[2]];
  }

  let va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
    let w = (d4 - d3) / (d4 - d3 + (d5 - d6));
    return [
      b[0] + w * (c[0] - b[0]),
      b[1] + w * (c[1] - b[1]),
      b[2] + w * (c[2] - b[2]),
    ];
  }

  let denom = 1 / (va + vb + vc);
  let v = vb * denom;
  let w = vc * denom;
  return [
    a[0] + ab[0] * v + ac[0] * w,
    a[1] + ab[1] * v + ac[1] * w,
    a[2] + ab[2] * v + ac[2] * w,
  ];
}

function projectOntoMesh(point) {
  let bestDist = Infinity;
  let bestPoint = null;
  for (let face of faces) {
    let a = vertices[face[0]];
    let b = vertices[face[1]];
    let c = vertices[face[2]];
    if (!a || !b || !c) continue;
    let proj = closestPointOnTriangle(point, a, b, c);
    let dx = point[0] - proj[0];
    let dy = point[1] - proj[1];
    let dz = point[2] - proj[2];
    let d = dx * dx + dy * dy + dz * dz;
    if (d < bestDist) {
      bestDist = d;
      bestPoint = proj;
    }
  }
  return bestPoint;
}

function nearestFaceIndex(point) {
  let bestDist = Infinity;
  let bestFi = 0;
  for (let fi = 0; fi < faces.length; fi++) {
    let face = faces[fi];
    let a = vertices[face[0]];
    let b = vertices[face[1]];
    let c = vertices[face[2]];
    if (!a || !b || !c) continue;
    let cx = (a[0] + b[0] + c[0]) / 3;
    let cy = (a[1] + b[1] + c[1]) / 3;
    let cz = (a[2] + b[2] + c[2]) / 3;
    let dx = point[0] - cx,
      dy = point[1] - cy,
      dz = point[2] - cz;
    let d = dx * dx + dy * dy + dz * dz;
    if (d < bestDist) {
      bestDist = d;
      bestFi = fi;
    }
  }
  return bestFi;
}

function seedMolds(spawnVerts) {
  molds = [];
  let n = min(numAgents, spawnVerts.length);
  for (let i = 0; i < n; i++) {
    let v = spawnVerts[i % spawnVerts.length];
    molds.push(new Mold([...v]));
  }
}

function exportTrailsOBJ() {
  let lines = [];
  let vertIndex = 1;

  for (let mold of molds) {
    if (mold.trail.length < 2) continue;

    // Write all vertex positions for this trail
    let startIndex = vertIndex;
    for (let p of mold.trail) {
      lines.push(`v ${p[0]} ${p[1]} ${p[2]}`);
      vertIndex++;
    }

    let indices = [];
    for (let i = startIndex; i < vertIndex; i++) {
      indices.push(i);
    }
    lines.push(`l ${indices.join(" ")}`);
  }

  // Trigger download
  let blob = new Blob([lines.join("\n")], { type: "text/plain" });
  let a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "slime_trails.obj";
  a.click();
}

function setup() {
  createCanvas(800, 600, WEBGL);
  angleMode(DEGREES);

  slider = createSlider(1, 100, 20, 1);
  slider.position(20, 620);
  slider.style("width", "400px");

  let label = createP("Agent coverage %");
  label.position(430, 608);
  label.style("color", "white");
  label.style("font-family", "monospace");

  let btn = createButton("Export trails");
  btn.position(20, 650);
  btn.mousePressed(() => exportTrailsOBJ());
}

function draw() {
  background(5, trailDecay);
  noFill();
  noStroke();

  if (!modelLoaded) {
    fill(255);
    textSize(16);
    textAlign(CENTER);
    text("Loading...", 0, 0);
    return;
  }

  orbitControl();
  ambientLight(80);

  // Bounding box
  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;
  let minZ = Infinity,
    maxZ = -Infinity;
  for (let v of vertices) {
    minX = min(minX, v[0]);
    maxX = max(maxX, v[0]);
    minY = min(minY, v[1]);
    maxY = max(maxY, v[1]);
    minZ = min(minZ, v[2]);
    maxZ = max(maxZ, v[2]);
  }
  let cx = (minX + maxX) / 2;
  let cy = (minY + maxY) / 2;
  let cz = (minZ + maxZ) / 2;
  let span = max(maxX - minX, maxY - minY, maxZ - minZ);
  let s = 300 / span;

  let cutoff = floor((slider.value() / 100) * vertices.length);
  let spawnVerts = vertices.slice(0, cutoff);

  // Reseed whenever slider changes
  if (cutoff !== lastCutoff) {
    lastCutoff = cutoff;
    seedMolds(spawnVerts);
  }

  for (let m of molds) {
    m.update(molds);
  }

  push();
  scale(s);
  translate(-cx, -cy, -cz);

  // Wireframe
  stroke(40);
  strokeWeight(0.3);
  noFill();
  for (let face of faces) {
    beginShape();
    for (let idx of face) {
      let v = vertices[idx];
      vertex(v[0], v[1], v[2]);
    }
    endShape(CLOSE);
  }

  stroke(0, 180, 255, 160);
  strokeWeight(0.8);
  noFill();
  for (let m of molds) {
    m.draw();
  }

  for (let i = 0; i < pheromone.length; i++) {
    pheromone[i] *= 0.995;
  }

  // Spawn vertex dots
  let sphereSize = span * 0.004;
  noStroke();
  fill(255, 40, 40);
  for (let v of spawnVerts) {
    push();
    translate(v[0], v[1], v[2]);
    sphere(sphereSize);
    pop();
  }

  pop();

  // HUD
  push();
  noStroke();
  fill(255);
  textSize(14);
  textAlign(LEFT);
  text(
    slider.value() +
      "% — " +
      spawnVerts.length +
      " verts — " +
      molds.length +
      " agents",
    -380,
    270
  );
  pop();

  push();
  fill(0);
  noStroke();
  textSize(12);
  textAlign(LEFT);

  let maxP = 0;
  for (let i = 0; i < pheromone.length; i++) {
    if (pheromone[i] > maxP) maxP = pheromone[i];
  }
  text("max pheromone: " + nf(maxP, 1, 3), -380, 290);
  pop();
}
