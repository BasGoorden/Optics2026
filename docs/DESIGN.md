# Optics2026 — Game Design

## Vision
A good-looking 3D puzzle game in the browser that teaches optics to high school
and early university students. Players steer glowing laser beams through mirrors,
lenses, prisms and other optical elements to reach targets. It should be fun
first, with the physics always correct and as much depth as each player wants.

## Decisions (agreed with the owner, 2026-11-08)

| Topic | Decision |
|---|---|
| Platform | Browser game, Three.js (3D), no install |
| Language | English only |
| Audience | High school (upper years) and first-year university |
| Devices | Laptops/desktops (incl. weaker school laptops) and classroom projectors. Mouse + keyboard. Touch is not a priority. |
| Gameplay | Puzzle levels, grouped into chapters by topic |
| Maths depth | Optional: playable by intuition, with toggles that show angles, normals, formulas and numbers |
| Visual style | Neon sci-fi lab: dark environment, glowing beams, glass and metal, bloom |
| Story | A friendly guide character (AI/robot assistant) introduces concepts and gives hints |
| Scoring | 1–3 stars per level |
| Progress | Saved locally in the browser (localStorage). No accounts or servers. |
| Audio | Sound effects + background music: 3 cheerful generated tracks the player can switch (or turn off), plus mute |
| First milestone | A small, polished slice: about 5 reflection/refraction levels |
| Repo | Private GitHub repo `BasGoorden/Optics2026` |

## Topics (chapters)
1. **Reflection.** Flat mirrors, the law of reflection, periscopes, corner reflectors.
2. **Refraction.** Snell's law, refractive index, glass blocks, total internal reflection, optical fibres.
3. **Lenses & imaging.** Converging and diverging lenses, focal points, the lens
   equation (1/f = 1/v + 1/u, sign convention stated in-game), magnification,
   telescopes, the eye and glasses.
4. **Colour & dispersion.** Prisms, wavelength-dependent index (e.g. Cauchy), rainbows,
   colour filters, additive mixing.
5. **Wave optics.** Double slit, diffraction gratings, single-slit diffraction,
   thin-film interference, polarisers and Malus's law. This chapter is the most university-level.

## Element catalogue (requested by the owner, 2026-11-08)
Besides lasers, mirrors, glass and prisms, the game should eventually include the elements below.

| Element | Idea | Fits chapter |
|---|---|---|
| Beam splitter | Half-silvered plate: 50% reflected, 50% transmitted | 1 (done) |
| **LEDs** | Broadband or coloured sources with a spread of angles and wavelengths (a fan of rays), unlike a laser | 3–4 |
| **Colour filters** | Pass a band of wavelengths and absorb the rest; colour-specific receivers | 4 |
| **Apertures** | Slits/irises that clip beams or ray fans; later a single slit gives diffraction | 3, 5 |
| **Gratings** | Split light into diffraction orders at angles from d·sin θ = m·λ, so colours separate | 4–5 |
| **Spatial light modulators (SLM)** | Programmable pixel element: the player "paints" a phase/deflection pattern to steer or shape the beam (a beam-steering puzzle, then holography-lite) | 5+ |
| **Cameras / screens** | A screen shows where light lands (spot, image, or interference pattern); a camera = lens + sensor that must form a sharp image | 3, 5 |
| **Objects to image** | An illuminated object (arrow, letter, picture) whose rays must be imaged sharply onto a screen/camera | 3 |

Imaging (objects → lens → screen/camera) needs ray *fans* from points rather than single
beams. The tracer already supports many rays, so an object can be modelled as a set of point
sources, each emitting a fan of rays.

## Core gameplay
- Each level is a 3D lab table on a grid. It contains fixed elements (light sources,
  walls, targets, glass blocks) and an **inventory** of elements the player can place.
- The player places, moves and rotates elements. The beam path is **recomputed live**,
  so players see the result straight away.
- **Targets** (detectors) light up when hit with the right conditions: a colour,
  intensity, polarisation or focus.
- A level is solved when all required targets are active.
- **Stars:**
  - ★ solved
  - ★★ solved within the par number of elements or moves
  - ★★★ bonus objective hit (e.g. an optional target, or no use of a certain element)
- **Physics overlay toggle (key `F` / button).** Shows the normals, angles of
  incidence and refraction, n values, and the live Snell or lens-equation
  calculation for the element under the cursor.
- **After each level**, a short "What just happened?" card from the guide explains the concept,
  with an optional "Deeper" section containing the formulas.

## Guide character
- A small floating robot / AI assistant. The working name is **"Lumen"** (it can be renamed).
- It introduces each chapter with 1–3 short lines and gives up to 3 hints per level,
  each more direct than the last.
- It speaks through text bubbles only, not voice.

## Beam model
- Beams travel in the **horizontal plane of the table** (2.5D). This keeps the puzzles
  readable and the physics clear, while everything is still rendered in full 3D with a free camera.
- Ray tracing is done analytically in a pure TypeScript physics module that is independent
  of rendering:
  - reflection, refraction (Snell), total internal reflection
  - partial reflection with Fresnel intensities (later)
  - thin lenses as ideal elements, and thick lenses or glass shapes as real refracting surfaces
  - wavelength-dependent n for dispersion
- Wave optics (chapter 5) uses dedicated elements whose results are computed
  analytically (e.g. intensity patterns) and shown on screens with shaders.

## Look & feel
- A dark sci-fi lab with a subtle grid floor, rim-lit metal mounts, and glass with transmission/refraction materials.
- Beams are bright emissive tubes with bloom, and their colour comes from the wavelength. Small particle sparks show where a beam hits a surface.
- Bloom must stay usable on weaker laptops, so there is a quality setting (Low/Medium/High).
  On a projector, text and contrast must stay readable.
- Camera: orbit around the table with limits, plus a "top view" toggle for precise placement.

## Out of scope (for now)
- Multiplayer, accounts, teacher dashboards, server backend
- Translations (the text is kept in one place so translations could be added later)
- Mobile/touch support
