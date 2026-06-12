let gridWidth = 600;
let gridHeight = 600;

let sliderCols, sliderRows;
let sliderMinRadius;
let sliderClearance; 
let sliderFrequency; 
let selectShape;
let selectPatternMode; 
let btnExport;
let isExporting = false;

function setup() {
  createCanvas(900, 700, SVG); 
  rectMode(CENTER);
  ellipseMode(CENTER);
  createUiControls();
  noLoop(); 
}

function draw() {
  clear(); 
  if (isExporting) {
    runGenerativeGrid();
    return;
  }

  background(245); 
  fill(230);
  noStroke();
  rect(775, height/2, 250, height);

  
  runGenerativeGrid();
}

function runGenerativeGrid() {
  let cols = sliderCols.value();
  let rows = sliderRows.value();
  let minR = sliderMinRadius.value();
  let clearanceFactor = sliderClearance.value(); 
  let patternFrequency = sliderFrequency.value(); 
  let currentShape = selectShape.value();
  let patternMode = selectPatternMode.value();

  let cellWidth = gridWidth / cols;
  let cellHeight = gridHeight / rows;

  let absoluteMaxRadius = min(cellWidth, cellHeight) / 2;
  let maxR = absoluteMaxRadius * clearanceFactor;

  let gridCenterX = gridWidth / 2;
  let gridCenterY = gridHeight / 2;
  

  if (!isExporting) {
    gridCenterX = 50 + gridWidth / 2;
    gridCenterY = 50 + gridHeight / 2;
  }
  
  let maxPossibleDistance = dist(50, 50, gridCenterX, gridCenterY);
  
  let startX = (isExporting ? 0 : 50) + cellWidth / 2;
  let startY = (isExporting ? 0 : 50) + cellHeight / 2;

  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      
      let x = startX + (i * cellWidth);
      let y = startY + (j * cellHeight);

      let scalarMultiplier = 0;

      if (patternMode === 'Radial (Center Out)') {
        let d = dist(x, y, gridCenterX, gridCenterY);
        scalarMultiplier = map(d, 0, maxPossibleDistance * patternFrequency, 1, 0, true);
      } 
      else if (patternMode === 'Inverse Radial') {
        let d = dist(x, y, gridCenterX, gridCenterY);
        scalarMultiplier = map(d, 0, maxPossibleDistance * patternFrequency, 0, 1, true);
      } 
      else if (patternMode === 'S-Pattern Wave') {
        let angle = i * patternFrequency;
        scalarMultiplier = map(sin(angle), -1, 1, 0, 1);
      } 
      else if (patternMode === 'Grid Ripple (2D Sine)') {
        let angle = (i + j) * patternFrequency;
        scalarMultiplier = map(sin(angle), -1, 1, 0, 1);
      }

      let safeMinR = min(minR, maxR * 0.9); 
      let currentRadius = map(scalarMultiplier, 0, 1, safeMinR, maxR);

      stroke(40);
      strokeWeight(1);
      noFill();

      push();
      translate(x, y);
      
      if (currentShape === 'Square' || currentShape === 'Triangle') {
        rotate(scalarMultiplier * TWO_PI * 0.05); 
      }

      if (currentShape === 'Circle') {
        ellipse(0, 0, currentRadius * 2, currentRadius * 2);
      } 
      else if (currentShape === 'Square') {
        rect(0, 0, currentRadius * 2, currentRadius * 2);
      } 
      else if (currentShape === 'Oval') {
        ellipse(0, 0, currentRadius * 2, currentRadius * 1.2); 
      } 
      else if (currentShape === 'Triangle') {
        drawEquilateralTriangle(0, 0, currentRadius);
      } 
      else if (currentShape === 'Hexagon') {
        drawPolygon(0, 0, currentRadius, 6);
      }
      
      pop();
    }
  }
}


function drawEquilateralTriangle(x, y, radius) {
  let h = radius * sqrt(3);
  triangle(x, y - (2/3)*h, x - radius, y + (1/3)*h, x + radius, y + (1/3)*h);
}

function drawPolygon(x, y, radius, npoints) {
  let angle = TWO_PI / npoints;
  beginShape();
  for (let a = 0; a < TWO_PI; a += angle) {
    let sx = x + cos(a) * radius;
    let sy = y + sin(a) * radius;
    vertex(sx, sy);
  }
  endShape(CLOSE);
}

function createUiControls() {
  let uiX = 670;
  
  createLabel("GRID DENSITY (COLS / ROWS)", uiX, 30);
  sliderCols = createSlider(5, 50, 30, 1);
  sliderCols.position(uiX, 50);
  sliderCols.input(updateCanvas);

  sliderRows = createSlider(5, 50, 30, 1);
  sliderRows.position(uiX, 80);
  sliderRows.input(updateCanvas); 

  createLabel("MIN RADIUS / MAX CLEARANCE", uiX, 130);
  sliderMinRadius = createSlider(1, 15, 1, 0.5);
  sliderMinRadius.position(uiX, 150);
  sliderMinRadius.input(updateCanvas);

  sliderClearance = createSlider(0.2, 0.95, 0.9, 0.01);
  sliderClearance.position(uiX, 180);
  sliderClearance.input(updateCanvas);

  createLabel("PATTERN WAVE FREQUENCY", uiX, 230);
  sliderFrequency = createSlider(0.1, 1.5, 0.4, 0.01);
  sliderFrequency.position(uiX, 250);
  sliderFrequency.input(updateCanvas);

  createLabel("GEOMETRY PRIMITIVE", uiX, 310);
  selectShape = createSelect();
  selectShape.position(uiX, 330);
  selectShape.option('Circle');
  selectShape.option('Square');
  selectShape.option('Oval');
  selectShape.option('Triangle');
  selectShape.option('Hexagon');
  selectShape.changed(updateCanvas);

  createLabel("MATHEMATICAL PATTERN ENGINE", uiX, 390);
  selectPatternMode = createSelect();
  selectPatternMode.position(uiX, 410);
  selectPatternMode.option('Radial (Center Out)');
  selectPatternMode.option('Inverse Radial');
  selectPatternMode.option('S-Pattern Wave');
  selectPatternMode.option('Grid Ripple (2D Sine)');
  selectPatternMode.changed(updateCanvas);

  btnExport = createButton('Export Pattern to SVG');
  btnExport.position(uiX, 480);
  btnExport.mousePressed(exportSvgPipeline);
}

function createLabel(txt, x, y) {
  let label = createP(txt);
  label.position(x, y - 15);
  label.style('font-family', 'sans-serif');
  label.style('font-size', '11px');
  label.style('font-weight', 'bold');
  label.style('color', '#333');
}

function updateCanvas() {
  redraw(); 
}

function exportSvgPipeline() {
  isExporting = true;
  resizeCanvas(gridWidth, gridHeight);
  clear();
  redraw(); 
  save("geometric_pattern.svg"); 
  setTimeout(() => {
    isExporting = false;
    resizeCanvas(900, 700);
    redraw();
  }, 100);
}