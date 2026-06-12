class Mold {
  constructor(startPos) {
    this.pos = [...startPos];
    this.heading = random(360);
    this.trail = [];
    this.speed = 0.5;
    this.sensorDist = sensorDistance;
    this.sensorAngle = sensorAngle;
    this.rotAngle = rotateAngle;
  }

  getSensorPos(angleOffset) {
    let normal = getMeshNormal(this.pos);

    let ref = [0, 1, 0];
    if (abs(dot3(normal, ref)) > 0.9) ref = [1, 0, 0];
    let tangent = normalize3(cross3(normal, ref));
    let bitangent = cross3(normal, tangent);

    let angle = this.heading + angleOffset;
    let candidate = [
      this.pos[0] +
        this.sensorDist * (cos(angle) * tangent[0] + sin(angle) * bitangent[0]),
      this.pos[1] +
        this.sensorDist * (cos(angle) * tangent[1] + sin(angle) * bitangent[1]),
      this.pos[2] +
        this.sensorDist * (cos(angle) * tangent[2] + sin(angle) * bitangent[2]),
    ];
    return projectOntoMesh(candidate);
  }

  senseTrail(sensorPos) {
    if (!sensorPos) return 0;
    let fi = nearestFaceIndex(sensorPos);
    return pheromone[fi];
  }
  update(allMolds) {
    // Replace the candidate calculation with tangent plane movement
    let normal = getMeshNormal(this.pos);
    let ref = [0, 1, 0];
    if (abs(dot3(normal, ref)) > 0.9) ref = [1, 0, 0];
    let tangent = normalize3(cross3(normal, ref));
    let bitangent = cross3(normal, tangent);

    let candidate = [
      this.pos[0] +
        this.speed *
          (cos(this.heading) * tangent[0] + sin(this.heading) * bitangent[0]),
      this.pos[1] +
        this.speed *
          (cos(this.heading) * tangent[1] + sin(this.heading) * bitangent[1]),
      this.pos[2] +
        this.speed *
          (cos(this.heading) * tangent[2] + sin(this.heading) * bitangent[2]),
    ];

    let snapped = projectOntoMesh(candidate);
    if (snapped) {
      this.pos = snapped;
      this.trail.push([...snapped]);
      if (this.trail.length > MAX_TRAIL_LENGTH) this.trail.shift();
      let fi = nearestFaceIndex(this.pos);
      pheromone[fi] += 1.0;
    }
  }

  draw() {
    if (this.trail.length < 2) return;
    beginShape();
    for (let p of this.trail) {
      vertex(p[0], p[1], p[2]);
    }
    endShape();
  }
}
