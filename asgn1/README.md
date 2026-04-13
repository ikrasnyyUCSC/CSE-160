# Assignment 1 – WebGL Paint Program

## Features Implemented

1. HTML canvas with WebGL rendering
2. Click to draw shapes
3. Code organized into setupWebGL(), connectVariablesToGLSL(), handleClicks(), and renderAllShapes()
4. RGB color sliders
5. Size slider with uniform variable passed to vertex shader
6. Clear button
7. Draw while mouse held down with mousemove
8. Triangle shape with drawTriangle() helper
9. Circle shape
10. Circle segment count slider with live label showing current value

## Extra Features

- **Undo button** — removes the last drawn shape from the list
- **Toggle Grid** — overlays a grid on top of all shapes so it remains visible even when the canvas is covered
- **IK Fish Picture** — drawing of a fish made entirely from triangles, with the initials IK inside. Clicking "Draw Picture" adds it to the shape list so you can continue drawing on top of it.

## Known Issues

- Performance degrades with a large number of shapes, especially circles with high segment counts. I've tried to optimize it, but performance did not reach a my desired level.