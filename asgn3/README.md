# Blocky World - Assignment 3

A first-person voxel world built with WebGL.
## Controls

| Key / Input | Action |
| W / S | Move forward / backward |
| A / D | Strafe left / right |
| Q / E | Rotate camera left / right |
| Mouse (click to lock) | Look around |
| F | Place block at target height |
| G | Delete block |
| T | Toggle cow dance + music |
| Scroll wheel | Cycle block texture (Brick → Grass → Stone) |
| ESC | Release mouse |

## Features

- **32×32 voxel world** with walls of varying heights built from a hardcoded 2D map
- **3 procedural textures** - brick, grass, stone - generated at startup, no external image files needed
- **Floating blocks** - place blocks at any height up to 32, with gaps allowed
- **Perspective camera** with full mouse look (pointer lock) and keyboard movement
- **Animated cow** that walks in a circle around the world
- **Dance mode** - press T to stop the cow in place and start a dance animation with music; music volume fades with distance

## Credit
This project was written by me, with Claude (Anthropic) used as an assistant for debugging, implementing specific features, and code organization. All design decisions, world layout, and creative direction are my own.

## Comments
The project runs at an average of 59 FPS on my machine. However, I observed frame rate drops to 45 FPS and occasionally 20 FPS on other machines. I believe this is a performance issue related to the number of draw calls per frame, but I did not have enough time to properly optimize it.

