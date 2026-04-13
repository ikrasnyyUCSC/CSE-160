// Most of the code is based on the provided examples from the book and the videos. 
// But I've tried to oprimize it using some help from outside sources
// That included various websites about js and some help from claude.

// Vertex shader program
var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'uniform float u_Size;\n' +
  'void main() {\n' +
  '  gl_Position = a_Position;\n' +
  '  gl_PointSize = u_Size;\n' +
  '}\n';

// Fragment shader program
var FSHADER_SOURCE =
  'precision mediump float;\n' +
  'uniform vec4 u_FragColor;\n' +
  'void main() {\n' +
  '  gl_FragColor = u_FragColor;\n' +
  '}\n';

// Global GL variables
var gl;
var canvas;
var a_Position;
var u_FragColor;
var u_Size;
var g_vertexBuffer = null;

// Global state
var g_shapesList = [];
var g_selectedShape = 'point';
var g_maxShapes = 1000;
var g_showGrid = false;

// Performance
var g_needsRender = false;
var g_lastMoveTime = 0;

// Classes
class Point {
  constructor(x, y, color, size) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.size = size;
  }
  render() {
    gl.vertexAttrib3f(a_Position, this.x, this.y, 0.0);
    gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);
    gl.uniform1f(u_Size, this.size);
    gl.drawArrays(gl.POINTS, 0, 1);
  }
}

class Triangle {
  constructor(x, y, color, size) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.size = size;
  }
  render() {
    gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);
    var s = this.size / 200;
    drawTriangle([
      this.x,        this.y + s,
      this.x - s,    this.y - s,
      this.x + s,    this.y - s
    ]);
  }
}

class Circle {
  constructor(x, y, color, size, segments) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.size = size;
    this.segments = segments;
    this.verts = [];
    var r = this.size / 100;
    var angleStep = (2 * Math.PI) / this.segments;
    for (var i = 0; i < this.segments; i++) {
      var a1 = i * angleStep;
      var a2 = (i + 1) * angleStep;
      this.verts.push([
        this.x, this.y,
        this.x + r * Math.cos(a1), this.y + r * Math.sin(a1),
        this.x + r * Math.cos(a2), this.y + r * Math.sin(a2)
      ]);
    }
  }
  render() {
    gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);
    for (var i = 0; i < this.verts.length; i++) {
      drawTriangle(this.verts[i]);
    }
  }
}
// Special case
class ColoredTriangle {
  constructor(coords, color) {
    this.coords = coords;
    this.color = color;
  }
  render() {
    gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);
    drawTriangle(this.coords);
  }
}

// Helper func
function drawTriangle(coords) {
  var vertices = new Float32Array(coords);
  gl.bindBuffer(gl.ARRAY_BUFFER, g_vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.disableVertexAttribArray(a_Position);
}

// Core functions
function setupWebGL() {
  canvas = document.getElementById('webgl');
  gl = getWebGLContext(canvas, { preserveDrawingBuffer: true });
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return false;
  }
  // Create buffer once
  g_vertexBuffer = gl.createBuffer();
  if (!g_vertexBuffer) {
    console.log('Failed to create buffer');
    return false;
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, g_vertexBuffer);
  return true;
}

function connectVariablesToGLSL() {
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to initialize shaders.');
    return false;
  }
  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return false;
  }
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  if (!u_FragColor) {
    console.log('Failed to get the storage location of u_FragColor');
    return false;
  }
  u_Size = gl.getUniformLocation(gl.program, 'u_Size');
  if (!u_Size) {
    console.log('Failed to get the storage location of u_Size');
    return false;
  }
  return true;
}

function click(ev) {
  // Convert mouse coords to WebGL coords
  var x = ev.clientX;
  var y = ev.clientY;
  var rect = ev.target.getBoundingClientRect();
  x = ((x - rect.left) - canvas.width/2)  / (canvas.width/2);
  y = (canvas.height/2 - (y - rect.top))  / (canvas.height/2);

  // UI values
  var r = document.getElementById('rSlider').value / 255;
  var g_val = document.getElementById('gSlider').value / 255;
  var b = document.getElementById('bSlider').value / 255;
  var color = [r, g_val, b, 1.0];
  var size = parseFloat(document.getElementById('sizeSlider').value);
  var segments = parseInt(document.getElementById('segSlider').value);

  // Cap shape list size
  if (g_shapesList.length >= g_maxShapes) {
    g_shapesList.shift();
  }
  // Create shape and add to list
  if (g_selectedShape === 'point') {
    g_shapesList.push(new Point(x, y, color, size));
  } else if (g_selectedShape === 'triangle') {
    g_shapesList.push(new Triangle(x, y, color, size));
  } else if (g_selectedShape === 'circle') {
    g_shapesList.push(new Circle(x, y, color, size, segments));
  }
  g_needsRender = true;
}

function drawGrid() {
  var gridColor = [0.3, 0.3, 0.3, 1.0];
  gl.uniform4f(u_FragColor, gridColor[0], gridColor[1], gridColor[2], gridColor[3]);
  var step = 0.1;

  // vertical lines
  for (var x = -1.0; x <= 1.0; x += step) {
    drawTriangle([
      x,         -1.0,
      x + 0.002, -1.0,
      x,          1.0
    ]);
    drawTriangle([
      x + 0.002, -1.0,
      x,          1.0,
      x + 0.002,  1.0
    ]);
  }
  // horizontal lines
  for (var y = -1.0; y <= 1.0; y += step) {
    drawTriangle([
      -1.0, y,
       1.0, y,
      -1.0, y + 0.002
    ]);
    drawTriangle([
       1.0, y,
      -1.0, y + 0.002,
       1.0, y + 0.002
    ]);
  }
}

function renderAllShapes() {
  // Clear canvas
  gl.clear(gl.COLOR_BUFFER_BIT);
  var len = g_shapesList.length;
  for (var i = 0; i < len; i++) {
    g_shapesList[i].render();
  }

  // Draw grid on top of everything
  if (g_showGrid) {
    drawGrid();
  }
}

function renderLoop() {
  if (g_needsRender) {
    renderAllShapes();
    g_needsRender = false;
  }
  requestAnimationFrame(renderLoop);
}

function clearCanvas() {
  g_shapesList = [];
  g_needsRender = true;
}

function undoShape() {
  if (g_shapesList.length > 0) {
    g_shapesList.pop();
    g_needsRender = true;
  }
}

function toggleGrid() {
  g_showGrid = !g_showGrid;
  g_needsRender = true;
}

function updateSegLabel(val) {
  document.getElementById('segLabel').innerText = val;
}

function drawPicture() {

  function addTri(coords, color) {
    g_shapesList.push(new ColoredTriangle(coords, color));
  }
    // Convert input coordinates into coordinates on cavnas. Added some buffer on the sides.
    function cx(x) { return (x / 9) * 1.6 - 0.8; }
    function cy(y) { return (y / 4) * 1.6 - 0.8; }

  var blue   = [0.2, 0.7, 1.0, 1.0];
  var yellow = [1.0, 0.9, 0.0, 1.0];

  // ---- Fish Body (blue) ----
  // Triangle 1
  addTri([cx(0),cy(2), cx(2),cy(4), cx(2),cy(2)], blue);
  // Triangle 2
  addTri([cx(0),cy(2), cx(2),cy(2), cx(2),cy(0)], blue);
  // Triangle 3
  addTri([cx(2),cy(4), cx(2),cy(0), cx(7),cy(4)], blue);
  // Triangle 4
  addTri([cx(2),cy(0), cx(7),cy(0), cx(7),cy(4)], blue);

// ---- Eye (red, 4 triangles) ----
  var red = [1.0, 0.1, 0.2, 1.0];
  addTri([cx(1),cy(2), cx(2),cy(2), cx(2),cy(3)], red);
  addTri([cx(2),cy(3), cx(3),cy(2), cx(2),cy(2)], red);
  addTri([cx(2),cy(2), cx(3),cy(2), cx(2),cy(1)], red);
  addTri([cx(2),cy(2), cx(2),cy(1), cx(1),cy(2)], red);

  // ---- Letter I (yellow) ----
  // Triangle 1
  addTri([cx(2),cy(0), cx(2),cy(1), cx(5),cy(1)], yellow);
  // Triangle 2
  addTri([cx(2),cy(0), cx(5),cy(0), cx(5),cy(1)], yellow);
  // Triangle 3
  addTri([cx(3),cy(1), cx(4),cy(1), cx(4),cy(3)], yellow);
  // Triangle 4
  addTri([cx(3),cy(1), cx(3),cy(3), cx(4),cy(3)], yellow);
  // Triangle 5
  addTri([cx(2),cy(3), cx(2),cy(4), cx(5),cy(4)], yellow);
  // Triangle 6
  addTri([cx(2),cy(3), cx(5),cy(3), cx(5),cy(4)], yellow);

  // ---- Letter K (yellow) ----
  // Triangle 1
  addTri([cx(6),cy(0), cx(6),cy(4), cx(7),cy(4)], yellow);
  // Triangle 2
  addTri([cx(6),cy(0), cx(7),cy(4), cx(7),cy(0)], yellow);
  // Triangle 3
  addTri([cx(7),cy(3), cx(8),cy(3), cx(8),cy(4)], yellow);
  // Triangle 4
  addTri([cx(7),cy(2), cx(7),cy(3), cx(8),cy(3)], yellow);
  // Triangle 5
  addTri([cx(7),cy(2), cx(7),cy(1), cx(8),cy(1)], yellow);
  // Triangle 6
  addTri([cx(7),cy(1), cx(8),cy(1), cx(8),cy(0)], yellow);
  // Square 1
  addTri([cx(8),cy(4), cx(9),cy(4), cx(8),cy(3)], yellow);
  addTri([cx(9),cy(4), cx(9),cy(3), cx(8),cy(3)], yellow);
  // Square 2
  addTri([cx(9),cy(0), cx(8),cy(0), cx(9),cy(1)], yellow);
  addTri([cx(8),cy(0), cx(8),cy(1), cx(9),cy(1)], yellow);

  g_needsRender = true;
  //I've used 24 triangles to make this glory of the image.
}

// Main

function main() {
  if (!setupWebGL()) return;
  if (!connectVariablesToGLSL()) return;
  // Mouse handlers
  canvas.onmousedown = function(ev) { click(ev); };
  canvas.onmousemove = function(ev) {
    if (ev.buttons == 1) {
      var now = performance.now();
      if (now - g_lastMoveTime > 16) { // ~60fps throttle
        g_lastMoveTime = now;
        click(ev);
      }
    }
  };
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  // Render loop
  requestAnimationFrame(renderLoop);
}