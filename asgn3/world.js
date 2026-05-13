//  world.js — Blocky World (Assignment 3)
//  Cow is handled by animal.js

// Shaders
const VSHADER_SOURCE = `
  attribute vec4 a_Position;
  attribute vec2 a_TexCoord;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjectionMatrix;
  varying vec2 v_TexCoord;
  void main() {
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;
    v_TexCoord  = a_TexCoord;
  }
`;

const FSHADER_SOURCE = `
  precision mediump float;
  uniform vec4      u_BaseColor;
  uniform sampler2D u_Sampler;
  uniform sampler2D u_Sampler1;
  uniform sampler2D u_Sampler2;
  uniform float     u_TexWeight;
  uniform int       u_TexIndex;
  varying vec2 v_TexCoord;
  void main() {
    vec4 texColor;
    if (u_TexIndex == 1)      texColor = texture2D(u_Sampler1, v_TexCoord);
    else if (u_TexIndex == 2) texColor = texture2D(u_Sampler2, v_TexCoord);
    else                      texColor = texture2D(u_Sampler,  v_TexCoord);
    gl_FragColor = mix(u_BaseColor, texColor, u_TexWeight);
  }
`;

// World map (32×32): 0=empty, 1‑4 = wall height 
const g_map = [
  [4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,2,2,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,3,3,3,3,0,0,0,0,0,0,4],
  [4,0,0,2,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,3,0,0,0,0,0,0,4],
  [4,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,3,0,0,0,0,0,0,4],
  [4,0,0,2,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,3,0,0,0,0,0,0,4],
  [4,0,0,2,2,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,3,3,3,3,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,4,4,4,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,0,0,4,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,0,0,4,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,4,4,4,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,2,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,3,0,0,0,0,4],
  [4,0,0,0,0,0,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,3,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4],
];

// Globals
let gl, canvas;
let a_Position, a_TexCoord;
let u_ModelMatrix, u_ViewMatrix, u_ProjectionMatrix;
let u_BaseColor, u_Sampler, u_Sampler1, u_Sampler2;
let u_TexWeight, u_TexIndex;
let g_vertexBuffer, g_texCoordBuffer;
let g_camera;
let g_worldProgram;
const g_keys = {};
let g_frameCount = 0, g_lastFPSTime = 0;
let g_pointerLocked = false;
let g_startTime = 0;
let g_buildTexIndex = 0; // 0=brick, 1=grass, 2=stone
const BUILD_TEX_NAMES = ['Brick', 'Grass', 'Stone'];
let g_gameWon   = false;
let g_winTime   = 0;
const FIND_DIST = 4.0;

// Cube geometry
const g_cubePos = new Float32Array([
  // Front  (+Z)
  -0.5,-0.5, 0.5,  0.5,-0.5, 0.5,  0.5, 0.5, 0.5,
  -0.5,-0.5, 0.5,  0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
  // Back   (-Z)
  -0.5,-0.5,-0.5,  0.5, 0.5,-0.5,  0.5,-0.5,-0.5,
  -0.5,-0.5,-0.5, -0.5, 0.5,-0.5,  0.5, 0.5,-0.5,
  // Top    (+Y)
  -0.5, 0.5,-0.5, -0.5, 0.5, 0.5,  0.5, 0.5, 0.5,
  -0.5, 0.5,-0.5,  0.5, 0.5, 0.5,  0.5, 0.5,-0.5,
  // Bottom (-Y)
  -0.5,-0.5,-0.5,  0.5,-0.5, 0.5, -0.5,-0.5, 0.5,
  -0.5,-0.5,-0.5,  0.5,-0.5,-0.5,  0.5,-0.5, 0.5,
  // Right  (+X)
   0.5,-0.5,-0.5,  0.5, 0.5, 0.5,  0.5,-0.5, 0.5,
   0.5,-0.5,-0.5,  0.5, 0.5,-0.5,  0.5, 0.5, 0.5,
  // Left   (-X)
  -0.5,-0.5,-0.5, -0.5,-0.5, 0.5, -0.5, 0.5, 0.5,
  -0.5,-0.5,-0.5, -0.5, 0.5, 0.5, -0.5, 0.5,-0.5,
]);

const g_cubeUV = new Float32Array([
  // Front  (+Z)
  0,0, 1,0, 1,1,  0,0, 1,1, 0,1,
  // Back   (-Z)
  1,0, 0,1, 0,0,  1,0, 1,1, 0,1,
  // Top    (+Y)
  0,1, 0,0, 1,0,  0,1, 1,0, 1,1,
  // Bottom (-Y)
  0,1, 1,0, 0,0,  0,1, 1,1, 1,0,
  // Right  (+X)
  1,0, 0,1, 0,0,  1,0, 1,1, 0,1,
  // Left   (-X)
  0,0, 1,0, 1,1,  0,0, 1,1, 0,1,
]);

// Camera
class Camera {
  constructor() {
    this.fov = 60;
    this.eye = new Vector3([2, 1.6, 2]);
    this.at  = new Vector3([16, 1.6, 16]);
    this.up  = new Vector3([0, 1, 0]);
    this.viewMatrix       = new Matrix4();
    this.projectionMatrix = new Matrix4();
    this._updateView();
    this.projectionMatrix.setPerspective(
      this.fov, canvas.width / canvas.height, 0.1, 1000
    );
  }
  _updateView() {
    this.viewMatrix.setLookAt(
      this.eye.elements[0], this.eye.elements[1], this.eye.elements[2],
      this.at.elements[0],  this.at.elements[1],  this.at.elements[2],
      this.up.elements[0],  this.up.elements[1],  this.up.elements[2]
    );
  }
  _forward() {
    let f = new Vector3(this.at.elements); f.sub(this.eye); f.normalize(); return f;
  }
  moveForward(s)   { let f=this._forward(); f.mul(s); this.eye.add(f); this.at.add(f); this._updateView(); }
  moveBackwards(s) { let f=this._forward(); f.mul(s); this.eye.sub(f); this.at.sub(f); this._updateView(); }
  moveLeft(s) {
    let f=this._forward(), side=Vector3.cross(this.up,f); side.normalize(); side.mul(s);
    this.eye.add(side); this.at.add(side); this._updateView();
  }
  moveRight(s) {
    let f=this._forward(), side=Vector3.cross(f,this.up); side.normalize(); side.mul(s);
    this.eye.add(side); this.at.add(side); this._updateView();
  }
  panLeft(deg)  { this._pan( deg); }
  panRight(deg) { this._pan(-deg); }
  _pan(deg) {
    let f=new Vector3(this.at.elements); f.sub(this.eye);
    let R=new Matrix4(); R.setRotate(deg, this.up.elements[0], this.up.elements[1], this.up.elements[2]);
    let fp=R.multiplyVector3(f);
    this.at.elements[0]=this.eye.elements[0]+fp.elements[0];
    this.at.elements[1]=this.eye.elements[1]+fp.elements[1];
    this.at.elements[2]=this.eye.elements[2]+fp.elements[2];
    this._updateView();
  }
  mouseLook(dx, dy) {
    this._pan(dx * 0.15);
    let f=new Vector3(this.at.elements); f.sub(this.eye);
    let right=Vector3.cross(f,this.up); right.normalize();
    let R=new Matrix4(); R.setRotate(dy*0.15, right.elements[0], right.elements[1], right.elements[2]);
    let fp=R.multiplyVector3(f);
    let newAt=new Vector3([
      this.eye.elements[0]+fp.elements[0],
      this.eye.elements[1]+fp.elements[1],
      this.eye.elements[2]+fp.elements[2],
    ]);
    let newF=new Vector3(newAt.elements); newF.sub(this.eye); newF.normalize();
    if (Math.abs(newF.elements[1]) < 0.98) this.at = newAt;
    this._updateView();
  }
}

// Proc. gen textures
function makeBrickTexture(size) {
  const c=document.createElement('canvas'); c.width=c.height=size;
  const ctx=c.getContext('2d');
  const bW=size/4, bH=size/8;
  ctx.fillStyle='#8a7a6a'; ctx.fillRect(0,0,size,size);
  for (let row=0; row<size/bH; row++) {
    const off=(row%2)*(bW/2);
    for (let col=-1; col<size/bW+1; col++) {
      const x=col*bW+off, y=row*bH;
      const r=140+Math.floor(Math.random()*40);
      const g=70+Math.floor(Math.random()*30);
      const b=50+Math.floor(Math.random()*20);
      ctx.fillStyle=`rgb(${r},${g},${b})`;
      ctx.fillRect(x+2,y+2,bW-4,bH-4);
    }
  }
  return c;
}

function makeGrassTexture(size) {
  const c=document.createElement('canvas'); c.width=c.height=size;
  const ctx=c.getContext('2d');
  ctx.fillStyle='#4a7a30'; ctx.fillRect(0,0,size,size);
  for (let i=0; i<size*4; i++) {
    const x=Math.random()*size, y=Math.random()*size;
    const g=80+Math.floor(Math.random()*60);
    ctx.fillStyle=`rgb(${30+Math.floor(Math.random()*30)},${g},20)`;
    ctx.fillRect(x,y,3,3);
  }
  return c;
}

function makeStoneTexture(size) {
  const c=document.createElement('canvas'); c.width=c.height=size;
  const ctx=c.getContext('2d');
  ctx.fillStyle='#888'; ctx.fillRect(0,0,size,size);
  for (let i=0; i<60; i++) {
    const x=Math.random()*size, y=Math.random()*size;
    const s=8+Math.random()*20;
    const v=100+Math.floor(Math.random()*80);
    ctx.fillStyle=`rgb(${v},${v},${v})`;
    ctx.fillRect(x,y,s,s);
  }
  return c;
}

function loadTexFromCanvas(texUnit, cnv) {
  const tex=gl.createTexture();
  gl.activeTexture(texUnit);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,cnv);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
}

// Draw helpers
function drawCube(M, color, texIndex, texWeight) {
  texWeight = (texWeight===undefined) ? 1.0 : texWeight;
  texIndex  = (texIndex ===undefined) ? 0   : texIndex;

  gl.uniform4f(u_BaseColor, color[0], color[1], color[2], 1.0);
  gl.uniform1f(u_TexWeight, texWeight);
  gl.uniform1i(u_TexIndex,  texIndex);
  gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);

  gl.bindBuffer(gl.ARRAY_BUFFER, g_vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, g_cubePos, gl.STATIC_DRAW);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.bindBuffer(gl.ARRAY_BUFFER, g_texCoordBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, g_cubeUV, gl.STATIC_DRAW);
  gl.vertexAttribPointer(a_TexCoord, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_TexCoord);

  gl.drawArrays(gl.TRIANGLES, 0, 36);
}

function drawWorld() {
  const HALF = 16;

  // Ground: grass texture
  let ground = new Matrix4();
  ground.setTranslate(HALF, -0.05, HALF);
  ground.scale(64, 0.1, 64);
  drawCube(ground, [0.4,0.7,0.3], 1, 1.0);

  // Sky box: solid blue, no texture
  let sky = new Matrix4();
  sky.setTranslate(HALF, 0, HALF);
  sky.scale(500, 500, 500);
  drawCube(sky, [0.35,0.55,0.9], 0, 0.0);

  // Blocks: sparse per-cell map
  for (let x=0; x<32; x++) {
    for (let z=0; z<32; z++) {
      const cell = g_blocks[z][x];
      for (const [y, t] of cell) {
        let cube = new Matrix4();
        cube.setTranslate(x+0.5, y+0.5, z+0.5);
        drawCube(cube, [0.8,0.75,0.7], t, 1.0);
      }
    }
  }
}

// Block storage
// g_blocks[z][x] = Map<y, texIndex>
const HEIGHT_LIMIT = 32;

const g_blocks = (() => {
  const arr = [];
  for (let z=0; z<32; z++) {
    arr[z] = [];
    for (let x=0; x<32; x++) {
      const cell = new Map();
      const h = g_map[z][x];
      // legacy: fill from 0 up to h with default textures
      const defTex = (h >= 3) ? 2 : 0;
      for (let y=0; y<h; y++) cell.set(y, defTex);
      arr[z][x] = cell;
    }
  }
  return arr;
})();

// Add/delete blocks
function getTargetCell() {
  // target XZ cell 2 units in front of camera
  let f = new Vector3(g_camera.at.elements); f.sub(g_camera.eye); f.normalize();
  let bx = Math.floor(g_camera.eye.elements[0] + f.elements[0] * 2.0);
  let bz = Math.floor(g_camera.eye.elements[2] + f.elements[2] * 2.0);
  // target Y = where the camera is looking (eye Y rounded)
  let by = Math.floor(g_camera.eye.elements[1] + f.elements[1] * 2.0);
  return { bx, bz, by };
}

function addBlock() {
  let {bx, bz, by} = getTargetCell();
  if (bx<0||bx>=32||bz<0||bz>=32) return;
  if (by<0||by>=HEIGHT_LIMIT) return;
  g_blocks[bz][bx].set(by, g_buildTexIndex);
}

function deleteBlock() {
  let {bx, bz, by} = getTargetCell();
  if (bx<0||bx>=32||bz<0||bz>=32) return;
  // delete the block at the target Y, or the nearest one above/below
  const cell = g_blocks[bz][bx];
  if (cell.has(by)) { cell.delete(by); return; }
  // fallback: delete topmost block in the cell
  if (cell.size === 0) return;
  const top = Math.max(...cell.keys());
  cell.delete(top);
}

// Game
function updateGame(t) {
  const msgEl   = document.getElementById('gameMsg');
  const timerEl = document.getElementById('gameTimer');

  if (g_gameWon) {
    timerEl.textContent = `You found her in ${g_winTime.toFixed(1)}s! Press T to dance 🎉`;
    return;
  }

  timerEl.textContent = `Time: ${t.toFixed(1)}s`;

  const cowPos = getCowPosition(t);
  const dx = g_camera.eye.elements[0] - cowPos.x;
  const dz = g_camera.eye.elements[2] - cowPos.z;
  const dist = Math.sqrt(dx*dx + dz*dz);

  if (dist < FIND_DIST) {
    g_gameWon = true;
    g_winTime = t;
    msgEl.textContent = 'You found the cow!';
  }
}

// Render
function renderScene() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  let t = performance.now()/1000 - g_startTime;

  // World pass
  gl.useProgram(g_worldProgram);
  gl.uniformMatrix4fv(u_ViewMatrix,       false, g_camera.viewMatrix.elements);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, g_camera.projectionMatrix.elements);
  drawWorld();

  // Cow pass — animal.js handles its own program switch internally
  drawCow(g_camera.viewMatrix, g_camera.projectionMatrix, t);
  updateAudioVolume(g_camera.eye.elements[0], g_camera.eye.elements[2]);

  // Game logic
  updateGame(t);

  // Restore world program for next frame
  gl.useProgram(g_worldProgram);
}

function main() {
  canvas = document.getElementById('webgl');
  gl = canvas.getContext('webgl');
  if (!gl) { alert('WebGL not supported'); return; }

  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.5, 0.7, 0.9, 1.0);

  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    alert('World shader init failed'); return;
  }
  g_worldProgram = gl.program;

  a_Position         = gl.getAttribLocation(gl.program,  'a_Position');
  a_TexCoord         = gl.getAttribLocation(gl.program,  'a_TexCoord');
  u_ModelMatrix      = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  u_ViewMatrix       = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  u_ProjectionMatrix = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
  u_BaseColor        = gl.getUniformLocation(gl.program, 'u_BaseColor');
  u_Sampler          = gl.getUniformLocation(gl.program, 'u_Sampler');
  u_Sampler1         = gl.getUniformLocation(gl.program, 'u_Sampler1');
  u_Sampler2         = gl.getUniformLocation(gl.program, 'u_Sampler2');
  u_TexWeight        = gl.getUniformLocation(gl.program, 'u_TexWeight');
  u_TexIndex         = gl.getUniformLocation(gl.program, 'u_TexIndex');

  g_vertexBuffer   = gl.createBuffer();
  g_texCoordBuffer = gl.createBuffer();

  loadTexFromCanvas(gl.TEXTURE0, makeBrickTexture(128));
  loadTexFromCanvas(gl.TEXTURE1, makeGrassTexture(128));
  loadTexFromCanvas(gl.TEXTURE2, makeStoneTexture(128));
  gl.uniform1i(u_Sampler,  0);
  gl.uniform1i(u_Sampler1, 1);
  gl.uniform1i(u_Sampler2, 2);

  // Init cow (animal.js)
  initAnimal(gl);

  g_camera = new Camera();

  document.addEventListener('keydown', e => { g_keys[e.key.toLowerCase()]=true;  onKeyDown(e); });
  document.addEventListener('keyup',   e => { g_keys[e.key.toLowerCase()]=false; });
  canvas.addEventListener('wheel', onScroll, { passive: false });
  canvas.addEventListener('click', () => canvas.requestPointerLock());
  document.addEventListener('pointerlockchange', () => {
    g_pointerLocked = document.pointerLockElement === canvas;
  });
  document.addEventListener('mousemove', e => {
    if (!g_pointerLocked) return;
    g_camera.mouseLook(-e.movementX, -e.movementY);
  });

  g_startTime   = performance.now()/1000;
  g_lastFPSTime = g_startTime;
  requestAnimationFrame(tick);
}

function onKeyDown(e) {
  if (e.key.toLowerCase()==='f') addBlock();
  if (e.key.toLowerCase()==='g') deleteBlock();
  if (e.key.toLowerCase()==='t') {
    let t = performance.now()/1000 - g_startTime;
    toggleDance(t);
  }
}

function onScroll(e) {
  e.preventDefault();
  g_buildTexIndex = (g_buildTexIndex + (e.deltaY > 0 ? 1 : -1) + 3) % 3;
  document.getElementById('texLabel').textContent = BUILD_TEX_NAMES[g_buildTexIndex];
}

const SPEED = 0.12;
const PAN   = 3.0;

function tick() {
  if (g_keys['w']) g_camera.moveForward(SPEED);
  if (g_keys['s']) g_camera.moveBackwards(SPEED);
  if (g_keys['a']) g_camera.moveLeft(SPEED);
  if (g_keys['d']) g_camera.moveRight(SPEED);
  if (g_keys['q']) g_camera.panLeft(PAN);
  if (g_keys['e']) g_camera.panRight(PAN);
  renderScene();
  updateFPS();
  requestAnimationFrame(tick);
}

function updateFPS() {
  g_frameCount++;
  let now=performance.now()/1000;
  if (now-g_lastFPSTime >= 1.0) {
    document.getElementById('fpsDisplay').textContent=(g_frameCount/(now-g_lastFPSTime)).toFixed(1);
    g_frameCount=0; g_lastFPSTime=now;
  }
}

window.onload = main;