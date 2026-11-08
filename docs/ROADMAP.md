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
- [x] Ideal thin lens elements (converging "Lens +", diverging "Lens −"), focal point markers (F)
- [x] Ray-fan sources: LEDs (fan of rays), illuminated arrow object (3 coloured points: base/mid/tip)
- [x] Receivers add up power from many rays (minPower); goals and bonus can require a power level
- [x] Screens show coloured spots where rays land, plus the image arrow once it is sharp;
      image analysis (blur = spot size containing 60% of each point's rays, magnification incl. sign)
- [x] Apertures (pinhole plates)
- [x] Physics panel: lens equation with u, v and m for the first lens
- [x] Levels 3-1 Focus!, 3-2 Parallel Universe (collimation), 3-3 Pinhole Camera, 3-4 Picture Perfect (two lens positions)
- [x] Levels split into one file per chapter (src/content/levels/)
- [x] Levels 3-5 Right Side Up (two-lens relay, upright image), 3-6 Glasses (nearsighted eye), 3-7 Say Cheese (camera focus)
- [ ] Ideas: magnifying glass / virtual images, telescope with angular magnification, adjustable iris

## Milestone 4 — Colour & dispersion
- [x] White light (spectrum of 6 wavelengths), white beams drawn white (colours merge on shared paths)
- [x] Dense flint prism with Cauchy dispersion, colour filters, dichroic mirrors, diffraction gratings (d·sin θ = m·λ, 2D + 3D)
- [x] Colour receivers: needed bands and forbidden bands
- [x] Levels 4-1 Rainbow Maker, 4-2 Colour Filters, 4-3 Mixing Colours (splitter vs dichroic), 4-4 Spectrometer
- [ ] Ideas: coloured LEDs in levels, subtractive filter stacks, rainbow in a water drop

## Milestone 5 — Waves & polarisation
- [x] Slit plates (single/double) carry their pattern to screens; screens draw the real intensity
      pattern sinc²·cos² on a dark patch with goal ticks; pattern goals (fringe spacing / central width)
- [x] Polarisation carried per ray, polarisers with Malus's law (incl. the three-polariser effect)
- [x] Spatial light modulator: programmable reflective phase grating (blazed ramps, binary split), Q/E cycles programs
- [x] Levels 5-1 Double Slit, 5-2 Single Slit, 5-3 Three Polarisers, 5-4 Beam Steering
- [ ] Not done: thin-film interference (anti-reflection coating level), holography-style SLM patterns

## Milestone 6 — Release
- [x] Credits, large-text option for projectors, chapter subtitles, colour receivers labelled with colour names
      and "lit/dark" text (not colour alone)
- [ ] Real playtest with students; performance check on a weak laptop and on a projector
- [ ] Hosting: needs a decision. GitHub Pages from a *private* repo needs a paid GitHub plan;
      alternatives: make the repo public, or Netlify/Cloudflare Pages