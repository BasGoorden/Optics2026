# Optics2026 — Roadmap

Status markers: `[ ]` todo, `[~]` in progress, `[x]` done.

## Milestone 0 — Project setup
- [x] Create folder + git repo, design docs
- [x] Vite + TypeScript + Three.js scaffold, Vitest
- [ ] ESLint/Prettier (skipped for now)
- [x] Private GitHub repo `BasGoorden/Optics2026`, push

## Milestone 1 — Polished vertical slice (≈5 levels)
Goal: a small part of the game that already looks and feels like the final game.
- [x] Physics core (pure TS, unit-tested): rays, segments, mirrors, flat glass
      surfaces, Snell's law, total internal reflection, interaction limit
- [x] Scene: neon lab environment, grid table, camera controls, bloom, quality setting
- [x] Elements: laser source, flat mirror, glass block, prism, target/receiver, bonus ring, wall
- [x] Interaction: place from tray, drag on grid, rotate (Q/E, scroll, handle; Shift = 1°), right-click remove
- [x] Level data + level select screen + stars + localStorage save + sequential unlock (teacher mode unlocks all)
- [x] Physics overlay (normals, angle labels, Snell / TIR calculations panel)
- [x] Guide "Lumen": 3D bot + speech bubble, intro lines, 3 hints per level, post-level explanation card
- [x] Audio: synthesised SFX, mute toggle, 3 switchable generative music tracks (Lab Groove, Starlight, Photon Pop) + off
- [x] 5 levels (now 1-1..1-3 and 2-1, 2-2), all solutions tested
- [~] Playtest: checked in the browser at 1024×768 (medium quality). Still to do: a real
      playtest by students, a performance check on a weak laptop at Low quality, and a classroom projector check.

### Known issues / polish ideas
- On small screens the physics panel can cover part of the table.
- Hovering a mirror shows no label of what it is.
- The main JS bundle is ~180 kB gzipped (Three.js). That is fine, but code splitting is possible.
- No undo yet (Reset restarts the whole level).

## Milestone 2 — Finish chapters 1–2
- [x] Beam branching in the tracer, beam splitters, Fresnel partial reflection at glass (weak beams shown dim)
- [x] Detection threshold: receivers/rings need ≥ 10% intensity
- [x] Chapters split: 1 Reflection (1-1..1-6), 2 Refraction (2-1..2-3); old saves migrated
- [x] New levels: 1-4 Split Decision, 1-5 Return to Sender (corner reflector), 1-6 Power Grid, 2-3 Light Pipe (fibre)
- [x] Rotatable lasers, coordinate labels on the table and in the selection panel
- [x] Tests: every level must not be solvable with a single element when par ≥ 2 (shortcut check)
- [ ] More refraction levels (glass shapes, prism periscope, water tank with n = 1.33, apparent depth)
- [ ] Variable splitters (e.g. 70/30) and receivers that need a minimum power

## Milestone 3 — Lenses & imaging (+ LEDs, apertures, objects, screens, cameras)
- [ ] Thin lens elements (converging/diverging), focal point markers
- [ ] Object/image visualisation (arrow object → image), lens equation overlay
- [ ] Ray-fan sources: LEDs (spread of angles), illuminated objects (arrow/letter) as sets of point sources
- [ ] Apertures / irises that clip ray fans
- [ ] Screens that show where light lands; cameras (lens + sensor) that need a sharp image
- [ ] Levels: focusing, telescopes, the eye and glasses, imaging an object onto a screen/camera

## Milestone 4 — Colour & dispersion
- [ ] Wavelength-coloured beams (renderer already colours by wavelength), white light splitting,
      Cauchy dispersion (`indexAt` already supports it)
- [ ] Prisms, colour filters, coloured LEDs, colour-specific targets, rainbow level
- [ ] Diffraction gratings as colour separators (d·sin θ = m·λ)

## Milestone 5 — Wave optics
- [ ] Screen element with shader intensity patterns
- [ ] Double slit, grating, single slit, thin film, polarisers (Malus's law)
- [ ] Spatial light modulators: paintable pixel element that steers/shapes the beam (beam-steering puzzles, holography-lite)

## Milestone 6 — Release
- [ ] Main menu polish, settings, credits, accessibility pass (contrast, colour-blind safe hints)
- [ ] Hosting (note: GitHub Pages from a *private* repo needs a paid GitHub plan;
      alternatives: make repo public, or Netlify/Cloudflare Pages)
