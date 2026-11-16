# Tactical Strike — Three.js FPS

A browser-based tactical first-person shooter built for the Make.fun `threejs-fps-02` challenge.

## Clone and run locally

Clone this repository, then enter the game folder:

```bash
git clone https://github.com/Alexandrexicara/meustrabalhos-mak.git
cd meustrabalhos-mak/threejs-fps
npm install
npm run dev
```

The game is inside `threejs-fps/`. Add supplied weapon models under `public/assets/weapons/` using the exact names `rifle.glb`, `pistol.glb`, and `at4.glb`. The HUD artwork is in `public/assets/icons/`; replace those SVGs with licensed transparent PNG/WebP artwork if desired, updating the image paths in `src/main.js`.

## Run locally

Requirements: Node.js 22.18+ and a desktop browser with WebGL2.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. The game uses Three.js and runs locally in the browser; no backend or network service is required after dependencies are installed.

## Controls

- `W A S D`: move
- Mouse: aim (click the game to lock pointer)
- Left mouse: fire
- `R`: reload
- `Shift`: sprint
- `Space`: jump
- `1` / `2`: select rifle / sidearm
- `Esc`: release pointer

## Game loop

Eliminate the opposing tactical bots, protect your health, and complete each round. The match advances through timed rounds with increasing bot pressure.

## Challenge note

The final Make.fun entry must include the required genuine build-session bundle, the public repository URL, and the full commit SHA. This repository alone is not a substitute for the challenge's session evidence.
