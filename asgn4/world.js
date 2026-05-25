//  world.js — Blocky World + Phong Lighting (Assignment 4)

const VSHADER_SOURCE = `
  attribute vec4 a_Position;
  attribute vec2 a_TexCoord;
  attribute vec3 a_Normal;

  uniform mat4 u_ModelMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjectionMatrix;
  uniform mat4 u_NormalMatrix;

  varying vec2  v_TexCoord;
  varying vec3  v_Normal;
  varying vec3  v_WorldPos;

  void main() {
    vec4 worldPos   = u_ModelMatrix * a_Position;
    gl_Position     = u_ProjectionMatrix * u_ViewMatrix * worldPos;
    v_TexCoord      = a_TexCoord;
    v_Normal        = normalize(vec3(u_NormalMatrix * vec4(a_Normal, 0.0)));
    v_WorldPos      = vec3(worldPos);
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

  uniform bool  u_LightingOn;
  uniform bool  u_ShowNormals;
  uniform bool  u_Light1On;
  uniform bool  u_Light2On;

  uniform vec3  u_Light1Pos;
  uniform vec3  u_LightColor;
  uniform float u_SpecularStrength;

  uniform vec3  u_Light2Pos;
  uniform vec3  u_Light2Dir;
  uniform float u_Light2Cutoff;

  uniform vec3  u_CameraPos;

  varying vec2  v_TexCoord;
  varying vec3  v_Normal;
  varying vec3  v_WorldPos;

  vec3 phong(vec3 lightPos, vec3 lightColor, vec3 normal, vec3 worldPos,
             vec3 viewDir, vec3 baseRGB, float attenScale) {
    vec3 ambient = 0.15 * lightColor * baseRGB;
    vec3  lightDir = normalize(lightPos - worldPos);
    float diff     = max(dot(normal, lightDir), 0.0);
    vec3  diffuse  = diff * lightColor * baseRGB;
    vec3  reflectDir = reflect(-lightDir, normal);
    float spec       = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
    vec3  specular   = u_SpecularStrength * spec * lightColor;
    return (ambient + diffuse + specular) * attenScale;
  }

  void main() {
    vec4 texColor;
    if (u_TexIndex == 1)      texColor = texture2D(u_Sampler1, v_TexCoord);
    else if (u_TexIndex == 2) texColor = texture2D(u_Sampler2, v_TexCoord);
    else                      texColor = texture2D(u_Sampler,  v_TexCoord);
    vec4 base = mix(u_BaseColor, texColor, u_TexWeight);

    if (u_ShowNormals) {
      gl_FragColor = vec4(abs(v_Normal), 1.0);
      return;
    }

    if (!u_LightingOn) {
      gl_FragColor = base;
      return;
    }

    vec3 normal  = normalize(v_Normal);
    vec3 viewDir = normalize(u_CameraPos - v_WorldPos);
    vec3 result  = vec3(0.0);

    if (u_Light1On) {
      result += phong(u_Light1Pos, u_LightColor, normal,
                      v_WorldPos, viewDir, base.rgb, 1.0);
    }

    if (u_Light2On) {
      vec3  toFrag  = normalize(v_WorldPos - u_Light2Pos);
      float cosA    = dot(toFrag, normalize(u_Light2Dir));
      if (cosA > u_Light2Cutoff) {
        float intensity = (cosA - u_Light2Cutoff) / (1.0 - u_Light2Cutoff);
        result += phong(u_Light2Pos, u_LightColor, normal,
                        v_WorldPos, viewDir, base.rgb, intensity);
      }
    }

    if (!u_Light1On && !u_Light2On) {
      result = 0.15 * base.rgb;
    }

    gl_FragColor = vec4(result, base.a);
  }
`;

const g_map = [
  [4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,3,3,3,3,0,0,0,0,0,0,4],
  [4,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,3,0,0,0,0,0,0,4],
  [4,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,3,0,0,0,0,0,0,4],
  [4,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,3,0,0,0,0,0,0,4],
  [4,0,0,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,3,3,3,3,0,0,0,0,0,0,4],
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
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
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

let gl, canvas;
let a_Position, a_TexCoord, a_Normal;
let u_ModelMatrix, u_ViewMatrix, u_ProjectionMatrix, u_NormalMatrix;
let u_BaseColor, u_Sampler, u_Sampler1, u_Sampler2;
let u_TexWeight, u_TexIndex;
let u_LightingOn, u_ShowNormals;
let u_Light1On, u_Light2On;
let u_Light1Pos, u_LightColor, u_SpecularStrength;
let u_Light2Pos, u_Light2Dir, u_Light2Cutoff;
let u_CameraPos;

let g_vertexBuffer, g_texCoordBuffer, g_normalBuffer;
let g_camera;
const g_keys = {};
let g_frameCount=0, g_lastFPSTime=0, g_startTime=0;
let g_pointerLocked=false;

let g_lightingOn       = true;
let g_showNormals      = false;
let g_light1On         = true;
let g_light2On         = true;
let g_lightHeight      = 8;
let g_lightColor       = [1,1,1];
let g_specularStrength = 0.5;
let g_lightAutoOrbit   = true;
let g_lightAngleOverride = 0;

let g_objVertices = null;
let g_objNormals  = null;
let g_objLoaded   = false;

const g_cubePos = new Float32Array([
  -0.5,-0.5, 0.5,  0.5,-0.5, 0.5,  0.5, 0.5, 0.5,
  -0.5,-0.5, 0.5,  0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
  -0.5,-0.5,-0.5,  0.5, 0.5,-0.5,  0.5,-0.5,-0.5,
  -0.5,-0.5,-0.5, -0.5, 0.5,-0.5,  0.5, 0.5,-0.5,
  -0.5, 0.5,-0.5, -0.5, 0.5, 0.5,  0.5, 0.5, 0.5,
  -0.5, 0.5,-0.5,  0.5, 0.5, 0.5,  0.5, 0.5,-0.5,
  -0.5,-0.5,-0.5,  0.5,-0.5, 0.5, -0.5,-0.5, 0.5,
  -0.5,-0.5,-0.5,  0.5,-0.5,-0.5,  0.5,-0.5, 0.5,
   0.5,-0.5,-0.5,  0.5, 0.5, 0.5,  0.5,-0.5, 0.5,
   0.5,-0.5,-0.5,  0.5, 0.5,-0.5,  0.5, 0.5, 0.5,
  -0.5,-0.5,-0.5, -0.5,-0.5, 0.5, -0.5, 0.5, 0.5,
  -0.5,-0.5,-0.5, -0.5, 0.5, 0.5, -0.5, 0.5,-0.5,
]);

const _n = (x,y,z,n) => Array(n).fill([x,y,z]).flat();
const g_cubeNormals = new Float32Array([
  ..._n( 0, 0, 1, 6),
  ..._n( 0, 0,-1, 6),
  ..._n( 0, 1, 0, 6),
  ..._n( 0,-1, 0, 6),
  ..._n( 1, 0, 0, 6),
  ..._n(-1, 0, 0, 6),
]);

const g_cubeUV = new Float32Array([
  0,0, 1,0, 1,1,  0,0, 1,1, 0,1,
  1,0, 0,1, 0,0,  1,0, 1,1, 0,1,
  0,1, 0,0, 1,0,  0,1, 1,0, 1,1,
  0,1, 1,0, 0,0,  0,1, 1,1, 1,0,
  1,0, 0,1, 0,0,  1,0, 1,1, 0,1,
  0,0, 1,0, 1,1,  0,0, 1,1, 0,1,
]);

function buildSphere(stacks, slices) {
  let pos=[], nrm=[], uv=[];
  for (let i=0; i<stacks; i++) {
    let phi1=(i/stacks)*Math.PI-Math.PI/2;
    let phi2=((i+1)/stacks)*Math.PI-Math.PI/2;
    for (let j=0; j<slices; j++) {
      let th1=(j/slices)*2*Math.PI;
      let th2=((j+1)/slices)*2*Math.PI;
      let verts=[
        [Math.cos(phi1)*Math.cos(th1),Math.sin(phi1),Math.cos(phi1)*Math.sin(th1)],
        [Math.cos(phi2)*Math.cos(th1),Math.sin(phi2),Math.cos(phi2)*Math.sin(th1)],
        [Math.cos(phi2)*Math.cos(th2),Math.sin(phi2),Math.cos(phi2)*Math.sin(th2)],
        [Math.cos(phi1)*Math.cos(th1),Math.sin(phi1),Math.cos(phi1)*Math.sin(th1)],
        [Math.cos(phi2)*Math.cos(th2),Math.sin(phi2),Math.cos(phi2)*Math.sin(th2)],
        [Math.cos(phi1)*Math.cos(th2),Math.sin(phi1),Math.cos(phi1)*Math.sin(th2)],
      ];
      for (let v of verts) { pos.push(...v); nrm.push(...v); uv.push(0,0); }
    }
  }
  return { pos:new Float32Array(pos), nrm:new Float32Array(nrm), uv:new Float32Array(uv), count:pos.length/3 };
}
const g_sphere = buildSphere(24, 24);

class Camera {
  constructor() {
    this.fov=60;
    this.eye=new Vector3([2,1.6,2]);
    this.at =new Vector3([16,1.6,16]);
    this.up =new Vector3([0,1,0]);
    this.viewMatrix=new Matrix4();
    this.projectionMatrix=new Matrix4();
    this._updateView();
    this.projectionMatrix.setPerspective(this.fov,canvas.width/canvas.height,0.1,1000);
  }
  _updateView() {
    this.viewMatrix.setLookAt(
      this.eye.elements[0],this.eye.elements[1],this.eye.elements[2],
      this.at.elements[0], this.at.elements[1], this.at.elements[2],
      this.up.elements[0], this.up.elements[1], this.up.elements[2]);
  }
  _forward() { let f=new Vector3(this.at.elements); f.sub(this.eye); f.normalize(); return f; }
  moveForward(s)   { let f=this._forward(); f.mul(s); this.eye.add(f); this.at.add(f); this._updateView(); }
  moveBackwards(s) { let f=this._forward(); f.mul(s); this.eye.sub(f); this.at.sub(f); this._updateView(); }
  moveLeft(s)  { let f=this._forward(),s2=Vector3.cross(this.up,f); s2.normalize(); s2.mul(s); this.eye.add(s2); this.at.add(s2); this._updateView(); }
  moveRight(s) { let f=this._forward(),s2=Vector3.cross(f,this.up); s2.normalize(); s2.mul(s); this.eye.add(s2); this.at.add(s2); this._updateView(); }
  panLeft(d)  { this._pan( d); }
  panRight(d) { this._pan(-d); }
  _pan(deg) {
    let f=new Vector3(this.at.elements); f.sub(this.eye);
    let R=new Matrix4(); R.setRotate(deg,this.up.elements[0],this.up.elements[1],this.up.elements[2]);
    let fp=R.multiplyVector3(f);
    this.at.elements[0]=this.eye.elements[0]+fp.elements[0];
    this.at.elements[1]=this.eye.elements[1]+fp.elements[1];
    this.at.elements[2]=this.eye.elements[2]+fp.elements[2];
    this._updateView();
  }
  mouseLook(dx,dy) {
    this._pan(dx*0.15);
    let f=new Vector3(this.at.elements); f.sub(this.eye);
    let right=Vector3.cross(f,this.up); right.normalize();
    let R=new Matrix4(); R.setRotate(dy*0.15,right.elements[0],right.elements[1],right.elements[2]);
    let fp=R.multiplyVector3(f);
    let nAt=new Vector3([this.eye.elements[0]+fp.elements[0],this.eye.elements[1]+fp.elements[1],this.eye.elements[2]+fp.elements[2]]);
    let nF=new Vector3(nAt.elements); nF.sub(this.eye); nF.normalize();
    if (Math.abs(nF.elements[1])<0.98) this.at=nAt;
    this._updateView();
  }
}

function makeBrickTexture(size) {
  const c=document.createElement('canvas'); c.width=c.height=size;
  const ctx=c.getContext('2d');
  const bW=size/4,bH=size/8;
  ctx.fillStyle='#8a7a6a'; ctx.fillRect(0,0,size,size);
  for(let row=0;row<size/bH;row++){
    const off=(row%2)*(bW/2);
    for(let col=-1;col<size/bW+1;col++){
      const x=col*bW+off,y=row*bH;
      const r=140+Math.floor(Math.random()*40),g=70+Math.floor(Math.random()*30),b=50+Math.floor(Math.random()*20);
      ctx.fillStyle=`rgb(${r},${g},${b})`; ctx.fillRect(x+2,y+2,bW-4,bH-4);
    }
  }
  return c;
}
function makeGrassTexture(size) {
  const c=document.createElement('canvas'); c.width=c.height=size;
  const ctx=c.getContext('2d');
  ctx.fillStyle='#4a7a30'; ctx.fillRect(0,0,size,size);
  for(let i=0;i<size*4;i++){
    const x=Math.random()*size,y=Math.random()*size,g=80+Math.floor(Math.random()*60);
    ctx.fillStyle=`rgb(${30+Math.floor(Math.random()*30)},${g},20)`; ctx.fillRect(x,y,3,3);
  }
  return c;
}
function makeStoneTexture(size) {
  const c=document.createElement('canvas'); c.width=c.height=size;
  const ctx=c.getContext('2d');
  ctx.fillStyle='#888'; ctx.fillRect(0,0,size,size);
  for(let i=0;i<60;i++){
    const x=Math.random()*size,y=Math.random()*size,s=8+Math.random()*20,v=100+Math.floor(Math.random()*80);
    ctx.fillStyle=`rgb(${v},${v},${v})`; ctx.fillRect(x,y,s,s);
  }
  return c;
}
function loadTexFromCanvas(texUnit,cnv) {
  const tex=gl.createTexture();
  gl.activeTexture(texUnit); gl.bindTexture(gl.TEXTURE_2D,tex);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,cnv);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
}

function setGeometry(pos, nrm, uvs) {
  gl.bindBuffer(gl.ARRAY_BUFFER, g_vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, pos, gl.STATIC_DRAW);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.bindBuffer(gl.ARRAY_BUFFER, g_normalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, nrm, gl.STATIC_DRAW);
  gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Normal);

  gl.bindBuffer(gl.ARRAY_BUFFER, g_texCoordBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
  gl.vertexAttribPointer(a_TexCoord, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_TexCoord);
}

function setUniforms(M, color, texIndex, texWeight) {
  texWeight=(texWeight===undefined)?1.0:texWeight;
  texIndex =(texIndex ===undefined)?0:texIndex;
  gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);
  let NM=new Matrix4(M); NM.invert(); NM.transpose();
  gl.uniformMatrix4fv(u_NormalMatrix, false, NM.elements);
  gl.uniform4f(u_BaseColor, color[0], color[1], color[2], 1.0);
  gl.uniform1f(u_TexWeight, texWeight);
  gl.uniform1i(u_TexIndex,  texIndex);
}

function drawCube(M, color, texIndex, texWeight) {
  setGeometry(g_cubePos, g_cubeNormals, g_cubeUV);
  setUniforms(M, color, texIndex, texWeight);
  gl.drawArrays(gl.TRIANGLES, 0, 36);
}

function drawSphere(M, color) {
  setGeometry(g_sphere.pos, g_sphere.nrm, g_sphere.uv);
  setUniforms(M, color, 0, 0.0);
  gl.drawArrays(gl.TRIANGLES, 0, g_sphere.count);
}

function drawOBJ(M, color) {
  if (!g_objLoaded) return;
  setGeometry(g_objVertices, g_objNormals, new Float32Array(g_objVertices.length/3*2));
  setUniforms(M, color, 0, 0.0);
  gl.drawArrays(gl.TRIANGLES, 0, g_objVertices.length/3);
}

function loadOBJ(url) {
  fetch(url)
    .then(r => r.text())
    .then(text => {
      const rawPos=[], rawNrm=[], posIdx=[], nrmIdx=[];
      for (let line of text.split('\n')) {
        const p=line.trim().split(/\s+/);
        if (p[0]==='v')  rawPos.push(+p[1],+p[2],+p[3]);
        if (p[0]==='vn') rawNrm.push(+p[1],+p[2],+p[3]);
        if (p[0]==='f') {
          // triangulate: supports tris and quads (fan triangulation)
          const verts=[];
          for (let i=1; i<p.length; i++) {
            const parts=p[i].split('/');
            verts.push({ pi:+parts[0]-1, ni:+(parts[2]||parts[0])-1 });
          }
          for (let i=1; i<verts.length-1; i++) {
            posIdx.push(verts[0].pi, verts[i].pi, verts[i+1].pi);
            nrmIdx.push(verts[0].ni, verts[i].ni, verts[i+1].ni);
          }
        }
      }
      const verts=[], norms=[];
      for (let i=0;i<posIdx.length;i++) {
        const pi=posIdx[i]*3, ni=nrmIdx[i]*3;
        verts.push(rawPos[pi],rawPos[pi+1],rawPos[pi+2]);
        if (rawNrm.length>0) norms.push(rawNrm[ni],rawNrm[ni+1],rawNrm[ni+2]);
        else norms.push(0,1,0);
      }
      g_objVertices=new Float32Array(verts);
      g_objNormals =new Float32Array(norms);
      g_objLoaded  =true;
      console.log(`OBJ loaded: ${verts.length/3} verts`);
    })
    .catch(e => console.warn('OBJ load failed:', e));
}

const g_blocks = (() => {
  const arr=[];
  for(let z=0;z<32;z++){
    arr[z]=[];
    for(let x=0;x<32;x++){
      const cell=new Map(), h=g_map[z][x], defTex=(h>=3)?2:0;
      for(let y=0;y<h;y++) cell.set(y,defTex);
      arr[z][x]=cell;
    }
  }
  return arr;
})();

function drawWorld(t) {
  const HALF=16;

  let ground=new Matrix4(); ground.setTranslate(HALF,-0.05,HALF); ground.scale(64,0.1,64);
  drawCube(ground,[0.4,0.7,0.3],1,1.0);

  let sky=new Matrix4(); sky.setTranslate(HALF,0,HALF); sky.scale(500,500,500);
  gl.uniform1i(u_LightingOn, false);
  drawCube(sky,[0.35,0.55,0.9],0,0.0);
  gl.uniform1i(u_LightingOn, g_lightingOn);

  for(let x=0;x<32;x++) for(let z=0;z<32;z++) {
    const cell=g_blocks[z][x];
    for(const [y,t2] of cell) {
      let cube=new Matrix4(); cube.setTranslate(x+0.5,y+0.5,z+0.5);
      drawCube(cube,[0.8,0.75,0.7],t2,1.0);
    }
  }

  let sph=new Matrix4(); sph.setTranslate(16,2,16); sph.scale(1.5,1.5,1.5);
  drawSphere(sph,[0.8,0.3,0.3]);

  if (g_objLoaded) {
      const count = 5;        // number of swords
      const radius = 4;       // orbit radius around the sphere
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * 2 * Math.PI + t * 0.8; 
        let obj = new Matrix4();
        obj.setTranslate(
          16 + Math.cos(angle) * radius,  
          2,                               
          16 + Math.sin(angle) * radius   
        );
        obj.rotate(-90, 1, 0, 0);         
        obj.rotate(t * 60, 0, 0, 1);      
        obj.scale(0.05, 0.05, 0.05);
        drawOBJ(obj, [0.6, 0.6, 0.9]);
      }
    }
  }


function getLightPos(t) {
  const angle=g_lightAutoOrbit ? t*0.5 : g_lightAngleOverride*Math.PI/180;
  return [16+Math.cos(angle)*10, g_lightHeight, 16+Math.sin(angle)*10];
}

const SPOT_POS=[16,20,16];
const SPOT_DIR=[0,-1,0];
const SPOT_CUTOFF=Math.cos(25*Math.PI/180);

function toggleLighting() {
  g_lightingOn=!g_lightingOn;
  const btn=document.getElementById('btnLighting');
  btn.textContent=`Lighting: ${g_lightingOn?'ON':'OFF'}`;
  btn.className=g_lightingOn?'on':'off';
}
function toggleNormals() {
  g_showNormals=!g_showNormals;
  const btn=document.getElementById('btnNormals');
  btn.textContent=`Normals: ${g_showNormals?'ON':'OFF'}`;
  btn.className=g_showNormals?'on':'off';
}
function toggleLight1() {
  g_light1On=!g_light1On;
  const btn=document.getElementById('btnLight1');
  btn.textContent=`Point Light: ${g_light1On?'ON':'OFF'}`;
  btn.className=g_light1On?'on':'off';
}
function toggleLight2() {
  g_light2On=!g_light2On;
  const btn=document.getElementById('btnLight2');
  btn.textContent=`Spot Light: ${g_light2On?'ON':'OFF'}`;
  btn.className=g_light2On?'on':'off';
}
function onLightColorChange(hex) {
  const r=parseInt(hex.slice(1,3),16)/255;
  const g=parseInt(hex.slice(3,5),16)/255;
  const b=parseInt(hex.slice(5,7),16)/255;
  g_lightColor=[r,g,b];
}

function renderScene(t) {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.uniformMatrix4fv(u_ViewMatrix,       false, g_camera.viewMatrix.elements);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, g_camera.projectionMatrix.elements);

  gl.uniform1i(u_LightingOn,  g_lightingOn);
  gl.uniform1i(u_ShowNormals, g_showNormals);
  gl.uniform1i(u_Light1On,    g_light1On);
  gl.uniform1i(u_Light2On,    g_light2On);

  const lp=getLightPos(t);
  gl.uniform3fv(u_Light1Pos,  lp);
  gl.uniform3fv(u_LightColor, g_lightColor);
  gl.uniform1f(u_SpecularStrength, g_specularStrength);

  gl.uniform3fv(u_Light2Pos,   SPOT_POS);
  gl.uniform3fv(u_Light2Dir,   SPOT_DIR);
  gl.uniform1f(u_Light2Cutoff, SPOT_CUTOFF);

  gl.uniform3f(u_CameraPos,
    g_camera.eye.elements[0],
    g_camera.eye.elements[1],
    g_camera.eye.elements[2]);

  drawWorld(t);

  gl.uniform1i(u_LightingOn, false);
  let lm=new Matrix4(); lm.setTranslate(lp[0],lp[1],lp[2]); lm.scale(0.3,0.3,0.3);
  drawCube(lm, g_lightColor, 0, 0.0);
  gl.uniform1i(u_LightingOn, g_lightingOn);
}

function main() {
  canvas=document.getElementById('webgl');
  gl=canvas.getContext('webgl');
  if (!gl) { alert('WebGL not supported'); return; }

  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.5,0.7,0.9,1.0);

  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) { alert('Shader init failed'); return; }

  a_Position=gl.getAttribLocation(gl.program,'a_Position');
  a_TexCoord=gl.getAttribLocation(gl.program,'a_TexCoord');
  a_Normal  =gl.getAttribLocation(gl.program,'a_Normal');

  u_ModelMatrix     =gl.getUniformLocation(gl.program,'u_ModelMatrix');
  u_ViewMatrix      =gl.getUniformLocation(gl.program,'u_ViewMatrix');
  u_ProjectionMatrix=gl.getUniformLocation(gl.program,'u_ProjectionMatrix');
  u_NormalMatrix    =gl.getUniformLocation(gl.program,'u_NormalMatrix');
  u_BaseColor       =gl.getUniformLocation(gl.program,'u_BaseColor');
  u_Sampler         =gl.getUniformLocation(gl.program,'u_Sampler');
  u_Sampler1        =gl.getUniformLocation(gl.program,'u_Sampler1');
  u_Sampler2        =gl.getUniformLocation(gl.program,'u_Sampler2');
  u_TexWeight       =gl.getUniformLocation(gl.program,'u_TexWeight');
  u_TexIndex        =gl.getUniformLocation(gl.program,'u_TexIndex');
  u_LightingOn      =gl.getUniformLocation(gl.program,'u_LightingOn');
  u_ShowNormals     =gl.getUniformLocation(gl.program,'u_ShowNormals');
  u_Light1On        =gl.getUniformLocation(gl.program,'u_Light1On');
  u_Light2On        =gl.getUniformLocation(gl.program,'u_Light2On');
  u_Light1Pos       =gl.getUniformLocation(gl.program,'u_Light1Pos');
  u_LightColor      =gl.getUniformLocation(gl.program,'u_LightColor');
  u_SpecularStrength=gl.getUniformLocation(gl.program,'u_SpecularStrength');
  u_Light2Pos       =gl.getUniformLocation(gl.program,'u_Light2Pos');
  u_Light2Dir       =gl.getUniformLocation(gl.program,'u_Light2Dir');
  u_Light2Cutoff    =gl.getUniformLocation(gl.program,'u_Light2Cutoff');
  u_CameraPos       =gl.getUniformLocation(gl.program,'u_CameraPos');

  g_vertexBuffer  =gl.createBuffer();
  g_texCoordBuffer=gl.createBuffer();
  g_normalBuffer  =gl.createBuffer();

  loadTexFromCanvas(gl.TEXTURE0, makeBrickTexture(128));
  loadTexFromCanvas(gl.TEXTURE1, makeGrassTexture(128));
  loadTexFromCanvas(gl.TEXTURE2, makeStoneTexture(128));
  gl.uniform1i(u_Sampler,  0);
  gl.uniform1i(u_Sampler1, 1);
  gl.uniform1i(u_Sampler2, 2);

  loadOBJ('sword.obj');

  g_camera=new Camera();

  document.addEventListener('keydown', e=>{ g_keys[e.key.toLowerCase()]=true; });
  document.addEventListener('keyup',   e=>{ g_keys[e.key.toLowerCase()]=false; });
  canvas.addEventListener('click', ()=>canvas.requestPointerLock());
  document.addEventListener('pointerlockchange', ()=>{ g_pointerLocked=document.pointerLockElement===canvas; });
  document.addEventListener('mousemove', e=>{ if (!g_pointerLocked) return; g_camera.mouseLook(-e.movementX,-e.movementY); });

  g_startTime  =performance.now()/1000;
  g_lastFPSTime=g_startTime;
  requestAnimationFrame(tick);
}

const SPEED=0.12, PAN=3.0;
function tick() {
  const t=performance.now()/1000-g_startTime;
  if (g_keys['w']) g_camera.moveForward(SPEED);
  if (g_keys['s']) g_camera.moveBackwards(SPEED);
  if (g_keys['a']) g_camera.moveLeft(SPEED);
  if (g_keys['d']) g_camera.moveRight(SPEED);
  if (g_keys['q']) g_camera.panLeft(PAN);
  if (g_keys['e']) g_camera.panRight(PAN);
  renderScene(t);
  updateFPS();
  requestAnimationFrame(tick);
}

function updateFPS() {
  g_frameCount++;
  const now=performance.now()/1000;
  if (now-g_lastFPSTime>=1.0) {
    document.getElementById('fpsDisplay').textContent=(g_frameCount/(now-g_lastFPSTime)).toFixed(1);
    g_frameCount=0; g_lastFPSTime=now;
  }
}

window.onload = main;