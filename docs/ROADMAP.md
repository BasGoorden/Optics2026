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
- [x] Audio: synthesised ambient hum and SFX, mute toggle
- [x] 5 levels: 1-1..1-3 reflection, 1-4 refraction, 1-5 total internal reflection (all solutions tested)
- [~] Playtest: checked in the browser at 1024×768 (medium quality). Still to do: a real
      playtest by students, a performance check on a weak laptop at Low quality, and a classroom projector check.

### Known issues / polish ideas
- On small screens the physics panel can cover part of the table.
- Hovering a mirror shows no label of what it is.
- The main JS bundle is ~180 kB gzipped (Three.js). That is fine, but code splitting is possible.
- No undo yet (Reset restarts the whole level).

## Milestone 2 — Finish chapters 1–2
- [ ] More reflection levels (periscope, corner reflector, multi-target)
- [ ] Refraction levels (glass shapes, fibres, TIR puzzles), partial reflection (Fresnel; `fresnelReflectance` exists)
- [ ] Beam splitters (requires beam branching in the tracer)

## Milestone 3 — Lenses & imaging
- [ ] Thin lens elements (converging/diverging), focal point markers
- [ ] Object/image visualisation (arrow object → image), lens equation overlay
- [ ] Levels: focusing, telescopes, the eye and glasses

## Milestone 4 — Colour & dispersion
- [ ] Wavelength-coloured beams (renderer already colours by wavelength), white light splitting,
      Cauchy dispersion (`indexAt` already supports it)
- [ ] Prisms, colour filters, colour-specific targets, rainbow level

## Milestone 5 — Wave optics
- [ ] Screen element with shader intensity patterns
- [ ] Double slit, grating, single slit, thin film, polarisers (Malus's law)

## Milestone 6 — Release
- [ ] Main menu polish, settings, credits, accessibility pass (contrast, colour-blind safe hints)
- [ ] Hosting (note: GitHub Pages from a *private* repo needs a paid GitHub plan;
      alternatives: make repo public, or Netlify/Cloudflare Pages)
