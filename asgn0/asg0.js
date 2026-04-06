// Due to the lack of knowledge of how to code on java script, most of the 
// code was written using examples from ChatGPT. The math and approach was done 
// by me, but I've used help of ChatGPT to translate it from C++ to javascript.
// I think that I've got pretty much used to it and would not require as much
// assistance with coding in further assignments.

function main() {
  var canvas = document.getElementById('example');
  if (!canvas) {
    console.log('Failed to retrieve the <canvas> element');
    return false;
  }

  var ctx = canvas.getContext('2d');

  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function handleDrawEvent() {
  var canvas = document.getElementById('example');
  var ctx = canvas.getContext('2d');

  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  var x1 = parseFloat(document.getElementById('x1').value);
  var y1 = parseFloat(document.getElementById('y1').value);
  var v1 = { elements: [x1, y1, 0] };
  drawVector(v1, "red");

  var x2 = parseFloat(document.getElementById('x2').value);
  var y2 = parseFloat(document.getElementById('y2').value);
  var v2 = { elements: [x2, y2, 0] };
  drawVector(v2, "blue");
}

function handleDrawOperationEvent() {
  var canvas = document.getElementById('example');
  var ctx = canvas.getContext('2d');

  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  var x1 = parseFloat(document.getElementById('x1').value);
  var y1 = parseFloat(document.getElementById('y1').value);
  var v1 = new Vector3([x1, y1, 0]);
  drawVector(v1, "red");

  var x2 = parseFloat(document.getElementById('x2').value);
  var y2 = parseFloat(document.getElementById('y2').value);
  var v2 = new Vector3([x2, y2, 0]);
  drawVector(v2, "blue");

  var operation = document.getElementById('operation').value;
  var scalar = parseFloat(document.getElementById('scalar').value);

  if (operation === 'add') {
    var v3 = new Vector3([x1, y1, 0]);
    v3.add(v2);
    drawVector(v3, "green");

  } else if (operation === 'sub') {
    var v3 = new Vector3([x1, y1, 0]);
    v3.sub(v2);
    drawVector(v3, "green");

  } else if (operation === 'mul') {
    var v3 = new Vector3([x1, y1, 0]);
    v3.mul(scalar);
    drawVector(v3, "green");
    var v4 = new Vector3([x2, y2, 0]);
    v4.mul(scalar);
    drawVector(v4, "green");

  } else if (operation === 'div') {
    var v3 = new Vector3([x1, y1, 0]);
    v3.div(scalar);
    drawVector(v3, "green");
    var v4 = new Vector3([x2, y2, 0]);
    v4.div(scalar);
    drawVector(v4, "green");

  } else if (operation === 'magnitude') {
    var mag1 = new Vector3([x1, y1, 0]).magnitude();
    var mag2 = new Vector3([x2, y2, 0]).magnitude();
    console.log("Magnitude of v1: " + mag1);
    console.log("Magnitude of v2: " + mag2);

  } else if (operation === 'normalize') {
    var v3 = new Vector3([x1, y1, 0]);
    v3.normalize();
    drawVector(v3, "green");
    var v4 = new Vector3([x2, y2, 0]);
    v4.normalize();
    drawVector(v4, "green");
  }
  else if (operation === 'angleBetween') {
  var v1obj = new Vector3([x1, y1, 0]);
  var v2obj = new Vector3([x2, y2, 0]);
  var angle = angleBetween(v1obj, v2obj);
  console.log("Angle:" + angle);
  }
  else if (operation === 'area') {
    var v1obj = new Vector3([x1, y1, 0]);
    var v2obj = new Vector3([x2, y2, 0]);
    var area = areaTriangle(v1obj, v2obj);
    console.log("Area: " + area);
  }
}

function drawVector(v, color) {
  var canvas = document.getElementById('example');
  var ctx = canvas.getContext('2d');

  var cx = canvas.width / 2;
  var cy = canvas.height / 2;

  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + v.elements[0] * 20, cy - v.elements[1] * 20);
  ctx.stroke();
}

function angleBetween(v1, v2) {
  var dot = Vector3.dot(v1, v2);
  var mag1 = v1.magnitude();
  var mag2 = v2.magnitude();
  var cosAlpha = dot / (mag1 * mag2);
  cosAlpha = Math.max(-1, Math.min(1, cosAlpha));
  var alpha = Math.acos(cosAlpha);
  return alpha * (180 / Math.PI);
}

function areaTriangle(v1, v2) {
  var cross = Vector3.cross(v1, v2);
  return cross.magnitude() / 2;
}