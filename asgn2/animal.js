
//  Shaders

const VSHADER_SOURCE = `
  attribute vec4 a_Position;
  uniform mat4 u_GlobalRotation;
  uniform mat4 u_ModelMatrix;
  void main() {
    gl_Position = u_GlobalRotation * u_ModelMatrix * a_Position;
  }
`;

const FSHADER_SOURCE = `
  precision mediump float;
  uniform vec4 u_Color;
  void main() {
    gl_FragColor = u_Color;
  }
`;

//  Globals - WebGL handles
let gl;
let a_Position;
let u_GlobalRotation;
let u_ModelMatrix;
let u_Color;
let g_vertexBuffer;

//  Globals - slider values (set by HTML oninput)
let g_globalAngle = 0;

let g_flThigh = 0;   // front left
let g_flCalf  = 0;
let g_flHoof  = 0;

let g_frThigh = 0;   // front right
let g_frCalf  = 0;
let g_frHoof  = 0;

let g_blThigh = 0;   // back left
let g_blCalf  = 0;
let g_blHoof = 0;

let g_brThigh = 0;   // back right
let g_brCalf  = 0;
let g_brHoof = 0;

let g_headNod  = 0;
let g_headTurn = 0;

let g_tailSwing = 0;
let g_tailTip   = 0;

//  Globals - animation
let g_animating = false;
let g_startTime = 0;
let g_time      = 0;

let g_poking    = false;
let g_pokeStart = 0;

let g_dancing        = false;
let g_danceState     = 0;
let g_danceStateStart = 0;
let g_danceTurnY     = 0;

//  Globals - mouse rotation
let g_mouseDown = false;
let g_lastMouseX = 0;
let g_lastMouseY = 0;
let g_mouseRotX  = 0;
let g_mouseRotY  = 0;

//  Globals - performance
let g_frameCount = 0;
let g_lastFPSTime = 0;

let g_flPoke = 0;
let g_frPoke = 0;
let g_blPoke = 0;
let g_brPoke = 0;
let g_neckNod = 0;

let g_danceAudio = new Audio('dance.mp3');

//  Geometry - cube verts (built once, reused every draw)
const g_cubeVerts = new Float32Array([
  // Front
  -0.5,-0.5, 0.5,  0.5,-0.5, 0.5,  0.5, 0.5, 0.5,
  -0.5,-0.5, 0.5,  0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
  // Back
  -0.5,-0.5,-0.5,  0.5, 0.5,-0.5,  0.5,-0.5,-0.5,
  -0.5,-0.5,-0.5, -0.5, 0.5,-0.5,  0.5, 0.5,-0.5,
  // Top
  -0.5, 0.5,-0.5, -0.5, 0.5, 0.5,  0.5, 0.5, 0.5,
  -0.5, 0.5,-0.5,  0.5, 0.5, 0.5,  0.5, 0.5,-0.5,
  // Bottom
  -0.5,-0.5,-0.5,  0.5,-0.5, 0.5, -0.5,-0.5, 0.5,
  -0.5,-0.5,-0.5,  0.5,-0.5,-0.5,  0.5,-0.5, 0.5,
  // Right
   0.5,-0.5,-0.5,  0.5, 0.5, 0.5,  0.5,-0.5, 0.5,
   0.5,-0.5,-0.5,  0.5, 0.5,-0.5,  0.5, 0.5, 0.5,
  // Left
  -0.5,-0.5,-0.5, -0.5,-0.5, 0.5, -0.5, 0.5, 0.5,
  -0.5,-0.5,-0.5, -0.5, 0.5, 0.5, -0.5, 0.5,-0.5,
]);

//  Geometry - cylinder verts (built once at startup)
function buildCylinderVerts(n) {
  let v = [];
  for (let i = 0; i < n; i++) {
    let a1 = (i / n) * 2 * Math.PI;
    let a2 = ((i + 1) / n) * 2 * Math.PI;
    let x1 = Math.cos(a1) * 0.5, z1 = Math.sin(a1) * 0.5;
    let x2 = Math.cos(a2) * 0.5, z2 = Math.sin(a2) * 0.5;
    // side
    v.push(x1,-0.5,z1, x2,-0.5,z2, x2, 0.5,z2);
    v.push(x1,-0.5,z1, x2, 0.5,z2, x1, 0.5,z1);
    // top cap
    v.push(0, 0.5, 0, x1, 0.5,z1, x2, 0.5,z2);
    // bottom cap
    v.push(0,-0.5, 0, x2,-0.5,z2, x1,-0.5,z1);
  }
  return new Float32Array(v);
}
const CYL_SEGMENTS   = 12;
const g_cylVerts     = buildCylinderVerts(CYL_SEGMENTS);
const g_cylVertCount = CYL_SEGMENTS * 4 * 3;

//  main() - entry point called by body onload
function main() {
  const canvas = document.getElementById('webgl');

  gl = canvas.getContext('webgl');
  if (!gl) { console.error('No WebGL'); return; }

  gl.enable(gl.DEPTH_TEST);

  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.error('Shader init failed'); return;
  }

  // Get attribute / uniform locations ONCE
  a_Position       = gl.getAttribLocation( gl.program, 'a_Position');
  u_GlobalRotation = gl.getUniformLocation(gl.program, 'u_GlobalRotation');
  u_ModelMatrix    = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  u_Color          = gl.getUniformLocation(gl.program, 'u_Color');

  // Create one shared buffer, reused by every draw call
  g_vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_vertexBuffer);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  // Mouse rotation
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseup',   () => { g_mouseDown = false; });

  // Kick off the animation loop
  g_startTime  = performance.now() / 1000;
  g_lastFPSTime = g_startTime;
  requestAnimationFrame(tick);
}

//  tick() - called every frame by the browser
function tick() {
  g_time = performance.now() / 1000 - g_startTime;
  if (g_animating || g_dancing || g_poking) updateAnimationAngles();
  renderScene();
  updateFPS();
  requestAnimationFrame(tick);
}

//  Animation
function toggleAnimation() {
  g_animating = !g_animating;
  g_dancing = false;
  document.getElementById('btnWalk').textContent  = g_animating ? 'Walk: ON' : 'Walk: OFF';
  document.getElementById('btnDance').textContent = 'Moo: OFF';
}

function toggleDance() {
  g_dancing = !g_dancing;
  g_animating = false;
  if (g_dancing) {
    g_danceState = 0;
    g_danceStateStart = g_time;
    g_danceTurnY = 0;
    g_danceAudio.currentTime = 0;
    g_danceAudio.play();
  } else {
    g_danceAudio.pause();
    g_danceAudio.currentTime = 0;
  }
  document.getElementById('btnDance').textContent = g_dancing ? 'Moo: ON' : 'Moo: OFF';
  document.getElementById('btnWalk').textContent  = 'Walk: OFF';
}

function resetSliders() {
  // Reset all globals
  g_globalAngle = g_flThigh = g_flCalf = g_flHoof = 0;
  g_frThigh = g_frCalf = g_frHoof = 0;
  g_blThigh = g_blCalf = 0;
  g_brThigh = g_brCalf = 0;
  g_blHoof = g_brHoof = 0;
  g_headNod = g_headTurn = g_tailSwing = g_tailTip = 0;
  g_mouseRotX = g_mouseRotY = 0;
  

  // Reset all HTML sliders to value="0"
  document.querySelectorAll('input[type=range]').forEach(s => s.value = 0);

  renderScene();
}

function updateAnimationAngles() {
  let t = g_time;

if (g_poking) {
    let pt = t - g_pokeStart;
    let fallDur = 0.5;
    let p = Math.min(pt / fallDur, 1);

    // legs splay out to the sides
    g_flPoke = -90 * p;
    g_frPoke =  90 * p;
    g_blPoke = -90 * p;
    g_brPoke =  90 * p;
    g_headNod = -15 * p;
    g_neckNod = -90 * p;

    // head drops down to body level
    if (pt > 3.0) {
      g_poking = false;
      g_flPoke = g_frPoke = g_blPoke = g_brPoke = 0;
      g_headNod = 0;
      g_neckNod = 0;
    }
    return;
  }

  if (g_dancing) {
    updateDance(t);
    return;
  }

  // Normal walk
  let speed = 2.5;
  g_flThigh =  25 * Math.sin(t * speed);
  g_flCalf  = -20 * (Math.sin(t * speed) + 1) * 0.5 - 5;
  g_flHoof  =  10 * Math.sin(t * speed);
  g_frThigh =  25 * Math.sin(t * speed + Math.PI);
  g_frCalf  = -20 * (Math.sin(t * speed + Math.PI) + 1) * 0.5 - 5;
  g_frHoof  =  10 * Math.sin(t * speed + Math.PI);
  g_blThigh =  25 * Math.sin(t * speed + Math.PI);
  g_blCalf  = -20 * (Math.sin(t * speed + Math.PI) + 1) * 0.5 - 5;
  g_brThigh =  25 * Math.sin(t * speed);
  g_brCalf  = -20 * (Math.sin(t * speed) + 1) * 0.5 - 5;
  g_headNod  =  5 * Math.sin(t * speed * 2);
  g_tailSwing = 30 * Math.sin(t * 2);
  g_tailTip   = 25 * Math.sin(t * 3 + 0.5);
}


// Cow dance
function updateDance(t) {
  // durations for each state in seconds
  const DUR = [0.3, 0.2, 0.6, 0.6, 0.5, 0.2, 0.6, 0.6, 0.5];

  // how long has this state been running
  let st = t - g_danceStateStart;

  // advance state if duration elapsed
  if (st > DUR[g_danceState]) {
    g_danceStateStart += DUR[g_danceState];
    g_danceState++;
    if (g_danceState >= DUR.length) g_danceState = 1; // loop back to state 1
    st = t - g_danceStateStart;
  }

  // progress 0..1 through current state
  let p = st / DUR[g_danceState];

  // reset all legs each frame, only set what we need
  g_flThigh = 0; g_frThigh = 0; g_blThigh = 0; g_brThigh = 0;
  g_flCalf  = 0; g_frCalf  = 0; g_blCalf  = 0; g_brCalf  = 0;
  g_headNod = 0; g_tailSwing = 0;

  switch (g_danceState) {
    case 0: // neutral
      break;

    case 1: // move right legs out 15 degree
      // lerp from 0 to 15 using p
      g_frThigh = 15 * p;
      g_brThigh = 15 * p;
      break;

    case 2: // rock right legs, cycle 1
    case 3: // rock right legs, cycle 2
      // rock -30 to +30 relative to the 15 degree out position
      // one full sine cycle per state
      g_frThigh = 15 + 30 * Math.sin(p * Math.PI * 2);
      g_brThigh = 15 + 30 * Math.sin(p * Math.PI * 2);
      g_headNod = 10 * Math.sin(p * Math.PI * 2); // head bobs with it
      g_tailSwing = 20 * Math.sin(p * Math.PI * 2);
      break;

    case 4: // jump to left - turn CCW 90 degree
      g_frThigh = 15 * (1 - p); // legs return to neutral
      g_brThigh = 15 * (1 - p);
      g_danceTurnY += 90 * (1 / 60); // spread over ~0.2s at 60fps
      // clamp so we don't overshoot - handled by state duration
      break;

    case 5: // move left legs out 15 degree
      g_flThigh = 15 * p;
      g_blThigh = 15 * p;
      break;

    case 6: // rock left legs, cycle 1
    case 7: // rock left legs, cycle 2
      g_flThigh = 15 + 30 * Math.sin(p * Math.PI * 2);
      g_blThigh = 15 + 30 * Math.sin(p * Math.PI * 2);
      g_headNod  = 10 * Math.sin(p * Math.PI * 2);
      g_tailSwing = 20 * Math.sin(p * Math.PI * 2);
      break;

    case 8: // jump to right - turn CW 90 degree
      g_flThigh = 15 * (1 - p);
      g_blThigh = 15 * (1 - p);
      g_danceTurnY -= 90 * (1 / 60);
      break;
  }
}

//  Mouse handlers
function onMouseDown(e) {
  if (e.shiftKey) {
    // Poke!
    g_poking    = true;
    g_pokeStart = g_time;
    return;
  }
  g_mouseDown  = true;
  g_lastMouseX = e.clientX;
  g_lastMouseY = e.clientY;
}

function onMouseMove(e) {
  if (!g_mouseDown) return;
  g_mouseRotY += (e.clientX - g_lastMouseX) * 0.5;
  g_mouseRotX += (e.clientY - g_lastMouseY) * 0.5;
  g_lastMouseX = e.clientX;
  g_lastMouseY = e.clientY;
  renderScene();
}

//  FPS counter
function updateFPS() {
  g_frameCount++;
  let now = performance.now() / 1000;
  let elapsed = now - g_lastFPSTime;
  if (elapsed >= 1.0) {
    document.getElementById('fpsDisplay').textContent =
      (g_frameCount / elapsed).toFixed(1);
    g_frameCount  = 0;
    g_lastFPSTime = now;
  }
}

//  renderScene(): draws everything, called every frame
function renderScene() {
  gl.clearColor(0.85, 0.85, 0.85, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Global rotation = slider + mouse drag combined
  let GR = new Matrix4();
  GR.setRotate(g_globalAngle + g_mouseRotY + g_danceTurnY, 0, 1, 0);
  GR.rotate(g_mouseRotX, 1, 0, 0);
  gl.uniformMatrix4fv(u_GlobalRotation, false, GR.elements);

  // --- BODY ---
  // Big wide box, centered at origin
  let body = new Matrix4();
  body.setTranslate(0, 0, 0);
  body.scale(0.9, 0.5, 0.5);
  drawCube(body, [0.1, 0.1, 0.1]); // black

// Black patch on body (just an offset cube on top)
  let patch = new Matrix4();
  patch.setTranslate(0.05, 0.15, 0.22);
  patch.scale(0.25, 0.25, 0.1);
  drawCube(patch, [1, 1, 1]);

  // Spot 1 — left side back
  let spot1 = new Matrix4();
  spot1.setTranslate(-0.2, 0.2, 0.26);
  spot1.scale(0.1, 0.15, 0.04);
  drawCube(spot1, [1, 1, 1]);

  // Spot 2 — right side front
  let spot2 = new Matrix4();
  spot2.setTranslate(0.15, 0.1, -0.26);
  spot2.scale(0.25, 0.1, 0.04);
  drawCube(spot2, [1, 1, 1]);

  // Spot 3 — top of body
  let spot3 = new Matrix4();
  spot3.setTranslate(-0.05, 0.26, 0.05);
  spot3.scale(0.15, 0.04, 0.1);
  drawCube(spot3, [1, 1, 1]);

  // Spot 4 — right side back
  let spot4 = new Matrix4();
  spot4.setTranslate(-0.25, 0.05, -0.26);
  spot4.scale(0.15, 0.2, 0.04);
  drawCube(spot4, [1, 1, 1]);

  // --- NECK ---
  let neck = new Matrix4();
  neck.setTranslate(0.4, 0.1, 0);
  neck.rotate(-15, 0, 0, 1);
  neck.rotate(g_neckNod, 0, 0, 1);  // add this line
  let neckBase = new Matrix4(neck);
  neck.scale(0.2, 0.3, 0.2);
  drawCube(neck, [0.95, 0.95, 0.95]);

  // --- HEAD ---
  // Starts from top of neck, applies headNod and headTurn
  let head = new Matrix4(neckBase);
  head.translate(0.05, 0.22, 0);
  head.rotate(g_headNod,  0, 0, 1);
  head.rotate(g_headTurn, 0, 1, 0);
  let headBase = new Matrix4(head); // save for snout/ears/horns
  head.scale(0.3, 0.3, 0.25);
  drawCube(head, [1, 1, 1]);

  // Snout
  let snout = new Matrix4(headBase);
  snout.translate(0.2, -0.05, 0);
  snout.scale(0.15, 0.15, 0.2);
  drawCube(snout, [0.9, 0.8, 0.8]);

  // Ear L
  let earL = new Matrix4(headBase);
  earL.translate(0.0, 0.12, 0.14);
  earL.rotate(-20, 1, 0, 0);
  earL.scale(0.1, 0.05, 0.15);
  drawCube(earL, [0.95, 0.95, 0.95]);

  // Ear R
  let earR = new Matrix4(headBase);
  earR.translate(0.0, 0.12, -0.14);
  earR.rotate(20, 1, 0, 0);
  earR.scale(0.1, 0.05, 0.15);
  drawCube(earR, [0.95, 0.95, 0.95]);

  // Horn L (cylinder!)
  let hornL = new Matrix4(headBase);
  hornL.translate(0.0, 0.2, 0.1);
  hornL.rotate(-30, 0, 0, 1);
  hornL.rotate(20, 1, 0, 0);
  hornL.scale(0.05, 0.2, 0.05);
  drawCylinder(hornL, [0.9, 0.85, 0.6]);

  // Horn R
  let hornR = new Matrix4(headBase);
  hornR.translate(0.0, 0.18, -0.1);
  hornR.rotate(-30, 0, 0, 1);
  hornR.rotate(-20, 1, 0, 0);
  hornR.scale(0.05, 0.2, 0.05);
  drawCylinder(hornR, [0.9, 0.85, 0.6]);

  // --- UDDER ---
  let udder = new Matrix4();
  udder.setTranslate(-0.1, -0.3, 0);
  udder.scale(0.3, 0.15, 0.25);
  drawCube(udder, [0.95, 0.75, 0.75]);

  // --- TAIL ---
  // Base of tail at the back of the body
  let tail = new Matrix4();
  tail.setTranslate(-0.45, 0.05, 0);
  tail.rotate(g_tailSwing, 0, 1, 0);
  tail.rotate(135, 0, 0, 1);         // naturally angled down
  let tailBase = new Matrix4(tail);
  tail.scale(0.1, 0.3, 0.1);
  drawCube(tail, [0.95, 0.95, 0.95]);

  // Tail tip (second joint)
  let tailTip = new Matrix4(tailBase);
  tailTip.translate(0, 0.3, 0);
  tailTip.rotate(g_tailTip, 0, 1, 0);
  tailTip.scale(0.1, 0.15, 0.1);
  drawCube(tailTip, [0.3, 0.2, 0.1]); // dark tuft

  // --- LEGS ---
  // Each leg: thigh -> calf -> hoof (3 levels)
  // Positions: front/back × left/right corners of body
  drawLeg( 0.3,  0.2, g_flThigh, g_flCalf, g_flHoof, g_flPoke); // front left
  drawLeg( 0.3, -0.2, g_frThigh, g_frCalf, g_frHoof, g_frPoke); // front right
  drawLeg(-0.3,  0.2, g_blThigh, g_blCalf, g_blHoof, g_blPoke); // back left
  drawLeg(-0.3, -0.2, g_brThigh, g_brCalf, g_brHoof, g_brPoke); // back right
}

//  drawLeg(x, z, thighAngle, calfAngle, hoofAngle)
//  x = forward/back position, z = left/right position
function drawLeg(x, z, thighAngle, calfAngle, hoofAngle, pokeSide) {
  const cowColor  = [0.95, 0.95, 0.95];
  const hoofColor = [0.2,  0.15, 0.1 ];

  // --- THIGH ---
  let thigh = new Matrix4();
  thigh.setTranslate(x, -0.22, z);
  thigh.rotate(pokeSide,   1, 0, 0);  // splay sideways (poke)
  thigh.rotate(thighAngle, 0, 0, 1);  // swing forward/back (walk)
  let thighBase = new Matrix4(thigh);
  thigh.scale(0.15, 0.3, 0.15);
  drawCube(thigh, cowColor);

  // --- CALF: bottom of thigh ---
  let calf = new Matrix4(thighBase);
  calf.translate(0, -0.21, 0);
  calf.rotate(calfAngle, 0, 0, 1);
  let calfBase = new Matrix4(calf);
  calf.scale(0.1, 0.3, 0.1);
  drawCube(calf, cowColor);

  // --- HOOF: bottom of calf ---
  let hoof = new Matrix4(calfBase);
  hoof.translate(0, -0.21, 0);
  hoof.rotate(hoofAngle, 0, 0, 1);
  hoof.scale(0.15, 0.1, 0.2);
  drawCube(hoof, hoofColor);
}

//  drawCube(Matrix, [r,g,b])
function drawCube(M, color) {
  gl.uniform4f(u_Color, color[0], color[1], color[2], 1.0);
  gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);
  gl.bindBuffer(gl.ARRAY_BUFFER, g_vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, g_cubeVerts, gl.STATIC_DRAW);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);
  gl.drawArrays(gl.TRIANGLES, 0, 36);
}

//  drawCylinder(Matrix, [r,g,b])
function drawCylinder(M, color) {
  gl.uniform4f(u_Color, color[0], color[1], color[2], 1.0);
  gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);
  gl.bindBuffer(gl.ARRAY_BUFFER, g_vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, g_cylVerts, gl.STATIC_DRAW);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);
  gl.drawArrays(gl.TRIANGLES, 0, g_cylVertCount);
}