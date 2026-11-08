/** Chapter 3: Lenses & imaging. */
import type { LevelDef } from '../../game/level';
import { TABLE } from './common';

export const CHAPTER3: LevelDef[] = [
  {
    id: '3-1',
    chapter: 3,
    title: 'Focus!',
    intro: [
      'New light source: an LED. Unlike a laser, it sends out a whole fan of rays.',
      'The receiver is tiny. Use a converging lens to gather the spreading light into one point.',
      'See the pink F marks? Those are the lens\'s focal points.',
    ],
    hints: [
      'Put the lens between the LED and the receiver, and watch where the rays cross.',
      'Move the lens until all the rays meet exactly at the receiver.',
      'Try the lens around (−1, 0).',
    ],
    explanation: {
      title: 'Converging lenses',
      body:
        'A converging lens bends every ray towards its axis: the further from the centre a ray hits the lens, the more it bends. '
        + 'So rays spreading from one point meet again at another point: the image. Magnifying glasses and your eyes do this.',
      deeper:
        'An ideal thin lens changes a ray\'s slope by −h/f, where h is the height at which it crosses the lens. '
        + 'All rays from a point at distance u then meet at distance v, with 1/f = 1/u + 1/v.',
    },
    bounds: TABLE,
    elements: [
      { id: 'led', kind: 'led', x: -5, y: 0, rotation: 0, spread: 10, rays: 15 },
      { id: 'target', kind: 'target', x: 3, y: 0, rotation: 0, r: 0.15, minPower: 0.6 },
    ],
    inventory: { lens: 1 },
    templates: { lens: { focal: 2 } },
    par: 1,
    bonus: { description: 'Focus 100% of the light into the receiver', minPower: { target: 1 } },
    solution: { place: [{ item: 'lens', x: 0.5, y: 0, rotation: 0 }] },
    bonusSolution: { place: [{ item: 'lens', x: -1, y: 0, rotation: 0 }] },
  },
  {
    id: '3-2',
    chapter: 3,
    title: 'Parallel Universe',
    intro: [
      'The receiver is at the end of a long, narrow tunnel. A spreading fan of light would just hit the walls.',
      'Can you make all the rays travel parallel, like a laser beam?',
    ],
    hints: [
      'A lens makes rays from its focal point come out parallel.',
      'So the LED must sit exactly at one of the lens\'s focal points (the pink F marks).',
      'This lens has f = 1.5. The light leaves the LED at x = −5, so put the lens at (−3.5, 0).',
    ],
    explanation: {
      title: 'Collimating light',
      body:
        'Light that starts at the focal point of a lens comes out as a parallel beam. Lighthouses, torches and car headlights '
        + 'use this to send light far away. Run it backwards and a lens focuses parallel light (like sunlight) to its focal point.',
      deeper:
        'With u = f the lens equation gives 1/v = 1/f − 1/f = 0, so v = ∞: the image is at infinity and the rays are parallel. '
        + 'The beam width is set by the LED\'s fan angle θ: w ≈ 2f·tan θ.',
    },
    bounds: TABLE,
    elements: [
      { id: 'led', kind: 'led', x: -5.22, y: 0, rotation: 0, spread: 15, rays: 15 },
      { id: 'w1', kind: 'wall', x: 2, y: 0.9, rotation: 0, w: 6, h: 0.6 },
      { id: 'w2', kind: 'wall', x: 2, y: -0.9, rotation: 0, w: 6, h: 0.6 },
      { id: 'target', kind: 'target', x: 5.4, y: 0, rotation: 0, r: 0.3, minPower: 0.7 },
    ],
    inventory: { lens: 1 },
    templates: { lens: { focal: 1.5, len: 2 } },
    par: 1,
    bonus: { description: 'Get 100% of the light through the tunnel', minPower: { target: 1 } },
    solution: { place: [{ item: 'lens', x: -3.5, y: 0, rotation: 0 }] },
    bonusSolution: { place: [{ item: 'lens', x: -3, y: 0, rotation: 0 }] },
  },
  {
    id: '3-3',
    chapter: 3,
    title: 'Pinhole Camera',
    intro: [
      'This glowing arrow is our object. Each coloured dot sends out light in all directions.',
      'On the screen everything blurs together. Put a plate with a tiny hole in between and see what happens.',
    ],
    hints: [
      'Through a tiny hole, only a thin bundle of rays from each dot gets through, so each dot makes a small spot.',
      'Look at the colours: the image is upside down! Rays from the top go through the hole and land at the bottom.',
      'Put the pinhole plate at (1, 0). For the bonus, move it closer to the object.',
    ],
    explanation: {
      title: 'The pinhole camera',
      body:
        'Light travels in straight lines, so each point of the object lights up just one small spot behind the hole. Together '
        + 'the spots form an upside-down image, with no lens at all. This "camera obscura" was used by artists centuries ago.',
      deeper:
        'Magnification m = −v/u (v = hole-to-screen, u = object-to-hole; the minus sign means inverted). Each spot is about '
        + 'd·(u + v)/u wide for a hole of width d. A smaller hole gives a sharper but dimmer image, until diffraction takes over.',
    },
    bounds: TABLE,
    elements: [
      { id: 'obj', kind: 'object', x: -4, y: 0, rotation: 0, spread: 20, rays: 41 },
      { id: 'screen', kind: 'screen', x: 4, y: 0, rotation: 0, len: 3 },
    ],
    inventory: { aperture: 1 },
    templates: { aperture: { gap: 0.3, len: 6 } },
    images: [{ screen: 'screen', object: 'obj', maxBlur: 0.45 }],
    par: 1,
    bonus: { description: 'Make the image at least as big as the object', magnification: { min: -10, max: -1 } },
    solution: { place: [{ item: 'aperture', x: 1, y: 0, rotation: 0 }] },
    bonusSolution: { place: [{ item: 'aperture', x: -0.5, y: 0, rotation: 0 }] },
  },
  {
    id: '3-4',
    chapter: 3,
    title: 'Picture Perfect',
    intro: [
      'A pinhole wastes most of the light. A lens collects much more of it and still forms a sharp image.',
      'Find a lens position that makes the arrow sharp on the screen. There are two!',
    ],
    hints: [
      'The diverging lens (Lens −) spreads light out. It can\'t form an image on a screen by itself.',
      'Use Lens + and slide it along the axis until the coloured spots shrink to points.',
      'With f = 2 and 9 units between object and screen, u = 3 and v = 6 works, and so does u = 6, v = 3. Try (−1.5, 0) or (1.5, 0).',
    ],
    explanation: {
      title: 'Forming a real image',
      body:
        'A converging lens images each point of the object onto one point of the screen. When the lens is closer to the object, '
        + 'the image is bigger; when it is closer to the screen, the image is smaller. Either way it is upside down. Cameras, projectors and your eyes work like this.',
      deeper:
        'With object-to-screen distance D = u + v and 1/f = 1/u + 1/v, there are two solutions when D > 4f: '
        + 'here u = 3, v = 6 (m = −2) and u = 6, v = 3 (m = −0.5). If D < 4f, no sharp image is possible at all.',
    },
    bounds: TABLE,
    elements: [
      { id: 'obj', kind: 'object', x: -4.5, y: 0, rotation: 0, spread: 12, rays: 9 },
      { id: 'screen', kind: 'screen', x: 4.5, y: 0, rotation: 0, len: 3 },
    ],
    inventory: { lens: 1, dlens: 1 },
    templates: { lens: { focal: 2, len: 2 }, dlens: { focal: -2, len: 2 } },
    images: [{ screen: 'screen', object: 'obj', maxBlur: 0.12 }],
    par: 1,
    bonus: { description: 'Make the image at least 1.5× bigger than the object', magnification: { min: -10, max: -1.5 } },
    solution: { place: [{ item: 'lens', x: 1.5, y: 0, rotation: 0 }] },
    bonusSolution: { place: [{ item: 'lens', x: -1.5, y: 0, rotation: 0 }] },
  },
];
