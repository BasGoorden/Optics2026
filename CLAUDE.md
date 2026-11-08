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

## Tech stack (planned)
- Vite + TypeScript + Three.js (plus `three/examples` postprocessing for bloom)
- Vitest for unit tests
- Beams are traced in the horizontal table plane (2.5D), rendered in 3D

## Architecture rules
- `src/physics/` is pure TypeScript with **no Three.js imports**. It contains the ray tracing, Snell's law,
  lens equation and dispersion code, and it is unit-tested. Physics must be correct: it is a teaching tool.
- Rendering, input, UI, audio and level data live in separate modules. Levels are data files, not code.
- All player-facing text is kept in one place (e.g. `src/content/`), which makes it easy to edit and to translate later.

## Owner / git
- GitHub: `BasGoorden/Optics2026` (private). Branch `main`.
- Commit identity is already configured globally. The `gh` CLI is installed at
  `C:\Program Files\GitHub CLI\gh.exe` (it may not be on PATH in older terminals).
