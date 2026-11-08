# Optics2026 — Roadmap

Status markers: `[ ]` todo, `[~]` in progress, `[x]` done.

## Milestone 0 — Project setup
- [x] Create folder + git repo, design docs
- [ ] Vite + TypeScript + Three.js scaffold, ESLint/Prettier, Vitest
- [ ] Private GitHub repo `BasGoorden/Optics2026`, push

## Milestone 1 — Polished vertical slice (≈5 levels)
Goal: a small part of the game that already looks and feels like the final game.
- [ ] Physics core (pure TS, unit-tested): rays, segments, mirrors, flat glass
      surfaces, Snell's law, total internal reflection, beam tree with max depth
- [ ] Scene: neon lab environment, grid table, camera controls, bloom, quality setting
- [ ] Elements: laser source, flat mirror, glass block, target/detector, wall
- [ ] Interaction: select, place from inventory, drag on grid, rotate (snap + fine)
- [ ] Level format (JSON/TS data) + loader; level select screen; stars; localStorage save
- [ ] Physics overlay (normals, angles, Snell calculation)
- [ ] Guide "Lumen": intro lines, hints, post-level explanation card
- [ ] Audio: ambient hum, place/rotate clicks, target-hit chime, mute toggle
- [ ] 5 levels: 1–3 reflection, 4–5 refraction / total internal reflection
- [ ] Playtest in browser, performance check on Low quality

## Milestone 2 — Finish chapters 1–2
- [ ] More reflection levels (periscope, corner reflector, multi-target)
- [ ] Refraction levels (glass shapes, fibres, TIR puzzles), partial reflection
- [ ] Beam splitters

## Milestone 3 — Lenses & imaging
- [ ] Thin lens elements (converging/diverging), focal point markers
- [ ] Object/image visualisation (arrow object → image), lens equation overlay
- [ ] Levels: focusing, telescopes, the eye and glasses

## Milestone 4 — Colour & dispersion
- [ ] Wavelength-coloured beams, white light splitting, Cauchy dispersion
- [ ] Prisms, colour filters, colour-specific targets, rainbow level

## Milestone 5 — Wave optics
- [ ] Screen element with shader intensity patterns
- [ ] Double slit, grating, single slit, thin film, polarisers (Malus's law)

## Milestone 6 — Release
- [ ] Main menu, settings, credits, accessibility pass (contrast, colour-blind safe hints)
- [ ] Hosting (note: GitHub Pages from a *private* repo needs a paid GitHub plan;
      alternatives: make repo public, or Netlify/Cloudflare Pages)
