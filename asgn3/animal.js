/*  This code was written mainly by me, with a slight
*   assistance from claude to fix up minor bugs and
*   some perdormance issues. Otherwise, I was the one
*   making it. In addition to that, please do not take
*   offence about the meme. The main point was making
*   a replica of a meme and not be inappropriate because
*   of the lyrics of the song.
*/


const ANIMAL_VSHADER = `
  attribute vec4 a_Position;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjectionMatrix;
  void main() {
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;
  }
`;

const ANIMAL_FSHADER = `
  precision mediump float;
  uniform vec4 u_Color;
  void main() {
    gl_FragColor = u_Color;
  }
`;

let _gl;
let _program;
let _a_Position;
let _u_ModelMatrix, _u_ViewMatrix, _u_ProjectionMatrix, _u_Color;
let _vertexBuffer;

// Cow world position
const COW_CENTER_X = 16, COW_CENTER_Z = 12; // center of the walking circle
const COW_RADIUS   = 3;                       // radius in world units
const COW_WALK_SPEED = 0.4;                   // radians per second
const COW_Y_BASE = 0.2;

// Tracks cow's angle when dance was toggled, so it stops in place
let _cowFrozenAngle = 0;
let _cowFrozenFacing = 90; // frozen facingY in degrees
let _cowFrozenX = COW_CENTER_X + COW_RADIUS;
let _cowFrozenZ = COW_CENTER_Z;
let _danceStartT = 0;   // t when dance started
let _timeOffset  = 0;   // accumulated t lost to dancing

// Dance state
let _dancing = false;
let _danceState = 0;
let _danceStateStart = 0;
let _danceTurnY = 0;
let _danceAudio = null;

const DANCE_DUR = [0.3, 0.2, 0.6, 0.6, 0.5, 0.2, 0.6, 0.6, 0.5];

function toggleDance(t) {
  _dancing = !_dancing;
  if (_dancing) {
    _danceStartT = t;
    // freeze position using offset-adjusted t
    let wt = t - _timeOffset;
    let walkAngle = wt * COW_WALK_SPEED;
    _cowFrozenX = COW_CENTER_X + Math.cos(-walkAngle) * COW_RADIUS;
    _cowFrozenZ = COW_CENTER_Z + Math.sin(-walkAngle) * COW_RADIUS;
    _cowFrozenFacing = walkAngle * (180/Math.PI) + 90;
    _danceState = 0;
    _danceStateStart = performance.now() / 1000;
    _danceTurnY = 0;
    if (_danceAudio) {
      _danceAudio.currentTime = 0;
      _danceAudio.play().catch(e => console.warn('Audio play blocked:', e));
    }
  } else {
    // absorb the time spent dancing so walk resumes from the same angle
    _timeOffset += t - _danceStartT;
    if (_danceAudio) { _danceAudio.pause(); _danceAudio.currentTime = 0; }
  }
}

function updateAudioVolume(camX, camZ, t) {
  if (!_danceAudio || !_dancing) return;
  let cowX = _dancing ? _cowFrozenX : COW_CENTER_X + Math.cos(t * COW_WALK_SPEED) * COW_RADIUS;
  let cowZ = _dancing ? _cowFrozenZ : COW_CENTER_Z + Math.sin(t * COW_WALK_SPEED) * COW_RADIUS;
  const dx = camX - cowX, dz = camZ - cowZ;
  const dist = Math.sqrt(dx*dx + dz*dz);
  _danceAudio.volume = Math.max(0, Math.min(0.5, 1 - dist / 15));
}

const _cubeVerts = new Float32Array([
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

function _buildCylVerts(n) {
  let v = [];
  for (let i = 0; i < n; i++) {
    let a1=(i/n)*2*Math.PI, a2=((i+1)/n)*2*Math.PI;
    let x1=Math.cos(a1)*.5, z1=Math.sin(a1)*.5;
    let x2=Math.cos(a2)*.5, z2=Math.sin(a2)*.5;
    v.push(x1,-.5,z1, x2,-.5,z2, x2,.5,z2, x1,-.5,z1, x2,.5,z2, x1,.5,z1);
    v.push(0,.5,0, x1,.5,z1, x2,.5,z2);
    v.push(0,-.5,0, x2,-.5,z2, x1,-.5,z1);
  }
  return new Float32Array(v);
}
const _CYL_N    = 12;
const _cylVerts = _buildCylVerts(_CYL_N);
const _cylCount = _CYL_N * 4 * 3;

function getCowPosition(t) {
  if (_dancing) return { x: _cowFrozenX, z: _cowFrozenZ };
  let angle = (t - _timeOffset) * COW_WALK_SPEED;
  return {
    x: COW_CENTER_X + Math.cos(-angle) * COW_RADIUS,
    z: COW_CENTER_Z + Math.sin(-angle) * COW_RADIUS,
  };
}

function initAnimal(gl) {
  _gl = gl;

  // Compile a separate shader program for the cow
  _program = createProgram(gl, ANIMAL_VSHADER, ANIMAL_FSHADER);
  if (!_program) { console.error('Animal shader failed'); return; }

  _a_Position         = gl.getAttribLocation(_program,  'a_Position');
  _u_ModelMatrix      = gl.getUniformLocation(_program, 'u_ModelMatrix');
  _u_ViewMatrix       = gl.getUniformLocation(_program, 'u_ViewMatrix');
  _u_ProjectionMatrix = gl.getUniformLocation(_program, 'u_ProjectionMatrix');
  _u_Color            = gl.getUniformLocation(_program, 'u_Color');

  _vertexBuffer = gl.createBuffer();

  _danceAudio = new Audio('dance.mp3');
  _danceAudio.loop = true;
  _danceAudio.volume = 0;
}

function drawCow(viewMatrix, projMatrix, t) {
  _gl.useProgram(_program);
  _gl.uniformMatrix4fv(_u_ViewMatrix,       false, viewMatrix.elements);
  _gl.uniformMatrix4fv(_u_ProjectionMatrix, false, projMatrix.elements);

  // Compute animation angles
  let flThigh=0, frThigh=0, blThigh=0, brThigh=0;
  let flCalf=0,  frCalf=0,  blCalf=0,  brCalf=0;
  let headNod=0, tailSwing=0;
  let turnY = 0;

  if (_dancing) {
    // Dance state
    let now = performance.now() / 1000;
    let st = now - _danceStateStart;
    if (st > DANCE_DUR[_danceState]) {
      _danceStateStart += DANCE_DUR[_danceState];
      _danceState++;
      if (_danceState >= DANCE_DUR.length) _danceState = 1;
      st = now - _danceStateStart;
    }
    let p = st / DANCE_DUR[_danceState];
    turnY = _danceTurnY;

    switch (_danceState) {
      case 1: frThigh=15*p; brThigh=15*p; break;
      case 2: case 3:
        frThigh=15+30*Math.sin(p*Math.PI*2); brThigh=15+30*Math.sin(p*Math.PI*2);
        headNod=10*Math.sin(p*Math.PI*2); tailSwing=20*Math.sin(p*Math.PI*2); break;
      case 4:
        frThigh=15*(1-p); brThigh=15*(1-p);
        _danceTurnY = 90 * p; turnY=_danceTurnY; break;
      case 5: flThigh=15*p; blThigh=15*p; break;
      case 6: case 7:
        flThigh=15+30*Math.sin(p*Math.PI*2); blThigh=15+30*Math.sin(p*Math.PI*2);
        headNod=10*Math.sin(p*Math.PI*2); tailSwing=20*Math.sin(p*Math.PI*2); break;
      case 8:
        flThigh=15*(1-p); blThigh=15*(1-p);
        _danceTurnY = 90 - 90 * p; turnY=_danceTurnY; break;
    }
    // Walk calves too
    flCalf = -20*(Math.sin(t*2.5)+1)*.5-5;
    frCalf = -20*(Math.sin(t*2.5+Math.PI)+1)*.5-5;
    blCalf = frCalf; brCalf = flCalf;
  } else {
    let wt = t - _timeOffset;
    let sp = 2.5;
    flThigh =  25*Math.sin(wt*sp);
    flCalf  = -20*(Math.sin(wt*sp)+1)*.5-5;
    frThigh =  25*Math.sin(wt*sp+Math.PI);
    frCalf  = -20*(Math.sin(wt*sp+Math.PI)+1)*.5-5;
    blThigh =  25*Math.sin(wt*sp+Math.PI);
    blCalf  = -20*(Math.sin(wt*sp+Math.PI)+1)*.5-5;
    brThigh =  25*Math.sin(wt*sp);
    brCalf  = -20*(Math.sin(wt*sp)+1)*.5-5;
    headNod   =  5*Math.sin(wt*5);
    tailSwing = 30*Math.sin(wt*2);
  }

  let bob = 0;

  // Compute world position and facing
  let cowX, cowZ, facingY;
  if (_dancing) {
    cowX = _cowFrozenX;
    cowZ = _cowFrozenZ;
    facingY = _cowFrozenFacing + _danceTurnY;
  } else {
    let angle = (t - _timeOffset) * COW_WALK_SPEED;
    cowX = COW_CENTER_X + Math.cos(-angle) * COW_RADIUS;
    cowZ = COW_CENTER_Z + Math.sin(-angle) * COW_RADIUS;
    facingY = angle * (180/Math.PI) + 90;
  }

  function cowM(local) {
    let m = new Matrix4();
    m.setTranslate(cowX, COW_Y_BASE, cowZ);
    m.rotate(facingY, 0, 1, 0);
    m.scale(0.6, 0.6, 0.6);
    m.multiply(local);
    return m;
  }

  // Body
  let body = new Matrix4(); body.setTranslate(0,0.5,0); body.scale(0.9,0.5,0.5);
  _drawCube(cowM(body), [0.1,0.1,0.1]);

  // Spots
  let patch = new Matrix4(); patch.setTranslate(0.05,0.65,0.22); patch.scale(0.25,0.25,0.1);
  _drawCube(cowM(patch), [1,1,1]);
  let spot1 = new Matrix4(); spot1.setTranslate(-0.2,0.7,0.26); spot1.scale(0.1,0.15,0.04);
  _drawCube(cowM(spot1), [1,1,1]);
  let spot2 = new Matrix4(); spot2.setTranslate(0.15,0.6,-0.26); spot2.scale(0.25,0.1,0.04);
  _drawCube(cowM(spot2), [1,1,1]);

  // Neck
  let neckBase = new Matrix4(); neckBase.setTranslate(0.4,0.6,0); neckBase.rotate(-15,0,0,1);
  let neck = new Matrix4(neckBase); neck.scale(0.2,0.3,0.2);
  _drawCube(cowM(neck), [0.95,0.95,0.95]);

  // Head
  let headBase = new Matrix4(neckBase); headBase.translate(0.05,0.22,0); headBase.rotate(headNod,0,0,1);
  let head = new Matrix4(headBase); head.scale(0.3,0.3,0.25);
  _drawCube(cowM(head), [1,1,1]);

  // Snout
  let snout = new Matrix4(headBase); snout.translate(0.2,-0.05,0); snout.scale(0.15,0.15,0.2);
  _drawCube(cowM(snout), [0.9,0.8,0.8]);

  // Ears
  let earL = new Matrix4(headBase); earL.translate(0,0.12,0.14); earL.rotate(-20,1,0,0); earL.scale(0.1,0.05,0.15);
  _drawCube(cowM(earL), [0.95,0.95,0.95]);
  let earR = new Matrix4(headBase); earR.translate(0,0.12,-0.14); earR.rotate(20,1,0,0); earR.scale(0.1,0.05,0.15);
  _drawCube(cowM(earR), [0.95,0.95,0.95]);

  // Horns
  let hornL = new Matrix4(headBase); hornL.translate(0,0.2,0.1); hornL.rotate(-30,0,0,1); hornL.rotate(20,1,0,0); hornL.scale(0.05,0.2,0.05);
  _drawCylinder(cowM(hornL), [0.9,0.85,0.6]);
  let hornR = new Matrix4(headBase); hornR.translate(0,0.18,-0.1); hornR.rotate(-30,0,0,1); hornR.rotate(-20,1,0,0); hornR.scale(0.05,0.2,0.05);
  _drawCylinder(cowM(hornR), [0.9,0.85,0.6]);

  // Udder
  let udder = new Matrix4(); udder.setTranslate(-0.1,0.2,0); udder.scale(0.3,0.15,0.25);
  _drawCube(cowM(udder), [0.95,0.75,0.75]);

  // Tail
  let tailBase = new Matrix4(); tailBase.setTranslate(-0.45,0.55,0); tailBase.rotate(tailSwing,0,1,0); tailBase.rotate(135,0,0,1);
  let tail = new Matrix4(tailBase); tail.scale(0.1,0.3,0.1);
  _drawCube(cowM(tail), [0.95,0.95,0.95]);
  let tailTip = new Matrix4(tailBase); tailTip.translate(0,0.3,0); tailTip.scale(0.1,0.15,0.1);
  _drawCube(cowM(tailTip), [0.3,0.2,0.1]);

  // Legs
  _drawLeg(cowM,  0.3,  0.2, flThigh, flCalf);
  _drawLeg(cowM,  0.3, -0.2, frThigh, frCalf);
  _drawLeg(cowM, -0.3,  0.2, blThigh, blCalf);
  _drawLeg(cowM, -0.3, -0.2, brThigh, brCalf);
}

// private draw helpers
function _drawLeg(cowM, x, z, thighA, calfA) {
  // Body bottom is at Y=0.25 (body center 0.5, half-height 0.25)
  let thighBase = new Matrix4(); thighBase.setTranslate(x, 0.25, z); thighBase.rotate(thighA,0,0,1);
  let thigh = new Matrix4(thighBase); thigh.scale(0.15,0.3,0.15);
  _drawCube(cowM(thigh), [0.95,0.95,0.95]);

  let calfBase = new Matrix4(thighBase); calfBase.translate(0,-0.3,0); calfBase.rotate(calfA,0,0,1);
  let calf = new Matrix4(calfBase); calf.scale(0.1,0.3,0.1);
  _drawCube(cowM(calf), [0.95,0.95,0.95]);

  let hoof = new Matrix4(calfBase); hoof.translate(0,-0.21,0); hoof.scale(0.15,0.1,0.2);
  _drawCube(cowM(hoof), [0.2,0.15,0.1]);
}

function _drawCube(M, color) {
  _gl.uniform4f(_u_Color, color[0], color[1], color[2], 1.0);
  _gl.uniformMatrix4fv(_u_ModelMatrix, false, M.elements);
  _gl.bindBuffer(_gl.ARRAY_BUFFER, _vertexBuffer);
  _gl.bufferData(_gl.ARRAY_BUFFER, _cubeVerts, _gl.STATIC_DRAW);
  _gl.vertexAttribPointer(_a_Position, 3, _gl.FLOAT, false, 0, 0);
  _gl.enableVertexAttribArray(_a_Position);
  _gl.drawArrays(_gl.TRIANGLES, 0, 36);
}

function _drawCylinder(M, color) {
  _gl.uniform4f(_u_Color, color[0], color[1], color[2], 1.0);
  _gl.uniformMatrix4fv(_u_ModelMatrix, false, M.elements);
  _gl.bindBuffer(_gl.ARRAY_BUFFER, _vertexBuffer);
  _gl.bufferData(_gl.ARRAY_BUFFER, _cylVerts, _gl.STATIC_DRAW);
  _gl.vertexAttribPointer(_a_Position, 3, _gl.FLOAT, false, 0, 0);
  _gl.enableVertexAttribArray(_a_Position);
  _gl.drawArrays(_gl.TRIANGLES, 0, _cylCount);
}