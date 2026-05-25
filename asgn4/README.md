# Blocky World — Lighting (Assignment 4)

A first-person WebGL world with Phong lighting, a loaded OBJ model, and interactive light controls.

## Controls

| Key / Input | Action |
| W / S | Move forward / backward |
| A / D | Strafe left / right |
| Q / E | Rotate camera left / right |
| Mouse (click to lock) | Look around |
| ESC | Release mouse |

## UI Controls

| Control | Action |
| Lighting ON/OFF | Toggle all Phong shading |
| Normals ON/OFF | Visualize vertex normals as color |
| Point Light ON/OFF | Toggle the orbiting point light |
| Spot Light ON/OFF | Toggle the fixed spotlight above the world |
| Light angle slider | Manually set the point light's orbit angle |
| Light height slider | Move the point light up or down |
| Light color picker | Change the color of both lights |
| Specular slider | Control specular highlight intensity |

## Features

- **Phong shading**: ambient, diffuse, and specular lighting on all objects
- **Point light**: orbits around the world center, with manual angle and height sliders
- **Spotlight**: fixed above the world center, pointing straight down with a 25° cone
- **Normal visualization**: toggle to see vertex normals rendered as colors
- **Sphere**: placed at world center, useful for verifying lighting correctness
- **OBJ model**: a sword loaded from `sword.obj`, with multiple copies orbiting the sphere
- **Procedural textures**: brick, grass, and stone generated at startup
- **32×32 voxel world** inherited from Assignment 3

## Credits

This project was written by me, with Claude (Anthropic) used as an assistant for debugging, implementing specific features, and code organization. All design decisions, world layout, and creative direction are my own.