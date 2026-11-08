# Optics2026

A 3D browser puzzle game (Three.js) that teaches optics to high school and university
students. Players guide laser beams through mirrors, lenses and prisms to reach targets.

**Read first:** [docs/DESIGN.md](docs/DESIGN.md) for the agreed design decisions and
[docs/ROADMAP.md](docs/ROADMAP.md) for milestones and current status. Keep the roadmap's
checkboxes up to date as work is finished. If a design decision changes, update DESIGN.md.

## Key decisions (summary)
- English only. Laptops/desktops + classroom projector, mouse + keyboard.
- Neon sci-fi lab style with bloom. Quality setting for weak school laptops.
- Puzzle levels by chapter, 1–3 stars, progress saved in localStorage only (no backend).
- Optional maths: physics overlay toggle; guide robot "Lumen" gives hints and explanations.
- SFX + ambient audio with mute.

## Tech stack
- Vite + TypeScript + Three.js (`three/addons` for OrbitControls, bloom, CSS2D labels)
- Vitest for unit tests
- Beams are traced in the horizontal table plane (2.5D), rendered in 3D

## Commands
- `npm run dev`: dev server at http://localhost:5173
- `npm test`: physics tests plus a solvability test for every level
- `npm run build`: type-check and production build to `dist/`

## Code map
- `src/physics/`: vec math, optics laws (`optics.ts`) and the 2D ray tracer (`trace.ts`)
- `src/game/`: element geometry (`elements.ts`), level types/evaluation/stars (`level.ts`) and play state (`session.ts`)
- `src/content/levels/`: one file per chapter (geometry + all level text + known solutions), `index.ts` lists chapters. `src/content/text.ts`: UI strings
- `src/render/`: `stage.ts` (renderer, bloom, lab, camera, quality), `elements.ts` (meshes), `beams.ts` (beams + overlay), `lumen.ts` (guide bot)
- `src/ui/hud.ts`: all HTML UI. `src/audio/audio.ts`: synthesised WebAudio SFX. `src/audio/music.ts`: generative music tracks. `src/save/progress.ts`: localStorage (save key v2)
- `src/app.ts`: game controller (input, selection, placement, completion)

## Conventions
- Table coordinates: x right, y away from the player. World space = (x, height, -y). Rotation is in degrees, CCW.
- Mirror/splitter rotation 0 means it lies along +x. Lasers/LEDs/objects emit along local +x. Lenses, screens and apertures stand across their local +x axis (rotation 0 = optical axis along +x).
- Scoring uses the 2D tracer (`trace.ts`) in the plane of the optical axis (`AXIS_HEIGHT` above the table).
  LEDs and objects are also drawn as 3D cones of rays by `trace3d.ts` (drawing only). It turns every 2D surface
  into a vertical surface using `verticalExtent()` (lenses become round discs), so in-plane rays match the 2D tracer exactly (tested).
  Keep the model heights in `render/` in sync with `HALF_HEIGHT` in `game/elements.ts`.
- Lenses are ideal thin lenses (slope change −h/f). Inventory items can differ from element kinds (`dlens` is a lens with f < 0); level `templates` set item properties.
- Every level must include `solution` (2 stars) and `bonusSolution` (3 stars). `levels.test.ts` checks both.
- Beams branch (splitters, Fresnel reflections). Receivers and rings add up the power of all rays reaching them and need ≥ 10% by default (or the target's `minPower`).
- Level ids are save keys: if you renumber levels, add a migration in `progress.ts`.
- Colour: rays carry a wavelength (white sources emit `WHITE`); `physics/colour.ts` has bands, filters/dichroics, gratings and colour receivers (`needs`/`forbid`).
- Waves: rays carry polarisation (Malus at polarisers); light through `slits` carries a pattern spec to screens, where `patternSize` gives Δy = λL/(1000·d) or W = 2λL/(1000·a) (λ nm, d/a µm). SLM programs are in `SLM_PROGRAMS`; Q/E cycles them.
- Inventory items are strings: standard ones in `ITEM_DEFAULTS` (level.ts), level-specific ones via `templates` (with `kind` and `label`).
- In dev builds, `window.opticsAudio` exposes the audio engine, and `window.optics` exposes the App for browser testing (`debugScreen(x, y)` gives the screen position of a table point).

## Architecture rules
- `src/physics/` is pure TypeScript with **no Three.js imports**. It contains the ray tracing, Snell's law,
  lens equation and dispersion code, and it is unit-tested. Physics must be correct: it is a teaching tool.
- Rendering, input, UI, audio and level data live in separate modules. Levels are data files, not code.
- All player-facing text is kept in one place (e.g. `src/content/`), which makes it easy to edit and to translate later.

## Owner / git
- GitHub: `BasGoorden/Optics2026` (private). Branch `main`.
- Commit identity is already configured globally. The `gh` CLI is installed at
  `C:\Program Files\GitHub CLI\gh.exe` (it may not be on PATH in older terminals).
