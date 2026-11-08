# Optics2026

A 3D browser puzzle game about optics. Guide glowing laser beams through mirrors,
lenses, prisms and slits, and learn how light really works along the way.

## ▶ Play it

**https://basgoorden.github.io/Optics2026/**

Runs in any modern browser on a laptop or desktop (mouse + keyboard). No install needed.

- 5 chapters, 29 levels: reflection, refraction, lenses & imaging, colour, waves & polarisation
- Drag parts to move them, Q/E or scroll to rotate, F for the physics overlay, H for hints
- Teachers: Settings → "Unlock all levels" and "Large text (for projectors)"

## Run it yourself

Requires [Node.js](https://nodejs.org/) 20.19 or newer.

```bash
npm install
npm run dev     # play at http://localhost:5173
npm test        # physics tests + a solvability check for every level
npm run build   # production build in dist/
```

Built with Three.js, TypeScript and Vite. For the design see [docs/DESIGN.md](docs/DESIGN.md), and for the plan and status see
[docs/ROADMAP.md](docs/ROADMAP.md). Every push to `main` is deployed to GitHub Pages automatically.
