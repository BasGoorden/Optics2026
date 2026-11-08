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
  {
    id: '3-5',
    chapter: 3,
    title: 'Right Side Up',
    intro: [
      'Every image so far was upside down. This screen needs the arrow the right way up.',
      'One lens flips the image. What would two lenses do?',
    ],
    hints: [
      'Let the first lens make an upside-down image somewhere in the middle of the table. The second lens images that image again.',
      'Two flips make the image upright again. Watch the colours: blue (base) should end up at the bottom.',
      'Each lens has f = 1.25. Put one at (−2.5, 0) and one at (2.5, 0).',
    ],
    explanation: {
      title: 'Relay lenses',
      body:
        'The first lens forms a real, inverted image. The second lens treats that image as its object and inverts it again, '
        + 'so the final image is upright. Periscopes, endoscopes and rifle scopes use relay lenses like this.',
      deeper:
        'Magnifications multiply: m = m₁·m₂. Two inverting stages give m₁ < 0 and m₂ < 0, so m > 0. With u = v = 2f for each stage, '
        + 'm₁ = m₂ = −1 and m = +1: a life-size upright image 4f + 4f = 10 units from the object.',
    },
    bounds: TABLE,
    elements: [
      { id: 'obj', kind: 'object', x: -5, y: 0, rotation: 0, spread: 15, rays: 11, len: 0.8 },
      { id: 'screen', kind: 'screen', x: 5, y: 0, rotation: 0, len: 2.4 },
    ],
    inventory: { lens: 2 },
    templates: { lens: { focal: 1.25, len: 2.4 } },
    images: [{ screen: 'screen', object: 'obj', maxBlur: 0.1, magnification: { min: 0.1, max: 10 } }],
    par: 2,
    bonus: { description: 'Make the upright image life-size (m between 0.9 and 1.1)', magnification: { min: 0.9, max: 1.1 } },
    solution: {
      place: [
        { item: 'lens', x: -2.5, y: 0, rotation: 0 },
        { item: 'lens', x: 3, y: 0, rotation: 0 },
      ],
    },
    bonusSolution: {
      place: [
        { item: 'lens', x: -2.5, y: 0, rotation: 0 },
        { item: 'lens', x: 2.5, y: 0, rotation: 0 },
      ],
    },
  },
  {
    id: '3-6',
    chapter: 3,
    title: 'Glasses',
    intro: [
      'This is a model eye: a lens at the front and a retina (the screen) at the back.',
      'The eyeball is a bit too long, so faraway things look blurry. This eye is nearsighted. Give it glasses!',
    ],
    hints: [
      'The eye\'s lens focuses the image in front of the retina. You need to move the focus further back.',
      'A diverging lens (Lens −) spreads the rays a little first, so the eye focuses them further back.',
      'Put Lens − (f = −2) at (0, 0) or (0.5, 0), in front of the eye.',
    ],
    explanation: {
      title: 'Correcting nearsightedness',
      body:
        'In a nearsighted (myopic) eye the image of faraway objects forms in front of the retina. A diverging lens in front of the eye '
        + 'makes the light spread slightly, so the eye focuses it further back, right on the retina. Farsighted eyes need converging lenses instead.',
      deeper:
        'Opticians measure lens strength in dioptres: D = 1/f with f in metres. Diverging (negative) lenses correct myopia. '
        + 'Two thin lenses close together act like one lens with 1/f = 1/f₁ + 1/f₂, so glasses effectively weaken the eye\'s own lens.',
    },
    bounds: TABLE,
    elements: [
      { id: 'obj', kind: 'object', x: -5, y: 0, rotation: 0, spread: 6, rays: 9 },
      { id: 'eye', kind: 'lens', x: 2.5, y: 0, rotation: 0, focal: 1.5, len: 1.4 },
      { id: 'retina', kind: 'screen', x: 5, y: 0, rotation: 0, len: 1.6 },
      { id: 'w1', kind: 'wall', x: 3.85, y: 1.05, rotation: 0, w: 2.7, h: 0.2, height: 1.9 },
      { id: 'w2', kind: 'wall', x: 3.85, y: -1.05, rotation: 0, w: 2.7, h: 0.2, height: 1.9 },
    ],
    inventory: { lens: 1, dlens: 1 },
    templates: { lens: { focal: 3, len: 1.6 }, dlens: { focal: -2, len: 1.6 } },
    images: [{ screen: 'retina', object: 'obj', maxBlur: 0.05 }],
    par: 1,
    bonus: { description: 'Perfect vision: blur below 0.02', maxBlur: 0.02 },
    solution: { place: [{ item: 'dlens', x: 0.5, y: 0, rotation: 0 }] },
    bonusSolution: { place: [{ item: 'dlens', x: 0, y: 0, rotation: 0 }] },
  },
  {
    id: '3-7',
    chapter: 3,
    title: 'Say Cheese',
    intro: [
      'This box is a camera: the screen at the back is its sensor.',
      'Put the lens inside the camera and focus it on the arrow.',
    ],
    hints: [
      'A camera focuses by moving its lens closer to or further from the sensor.',
      'The object is about 9 units away, so the image forms just beyond the focal point (f = 2).',
      'Try the lens at (2, 0) or (2.5, 0).',
    ],
    explanation: {
      title: 'How a camera focuses',
      body:
        'For a faraway object the image forms close to the focal point. For nearer objects it forms further behind the lens, '
        + 'so the camera moves the lens forward to focus. Your eye can\'t move its lens, so it changes the lens\'s shape instead.',
      deeper:
        'From 1/f = 1/u + 1/v: as u → ∞, v → f. Here u ≈ 7, f = 2, so v = 1/(1/2 − 1/7) = 2.8. '
        + 'Depth of field (how much stays sharp) grows when the aperture is smaller: that is the f-number on a camera.',
    },
    bounds: TABLE,
    elements: [
      { id: 'obj', kind: 'object', x: -5, y: 0, rotation: 0, spread: 8, rays: 9, len: 1.6 },
      { id: 'sensor', kind: 'screen', x: 5, y: 0, rotation: 0, len: 1.2 },
      { id: 'top', kind: 'wall', x: 3.7, y: 0.95, rotation: 0, w: 3.8, h: 0.3, height: 1.9 },
      { id: 'bottom', kind: 'wall', x: 3.7, y: -0.95, rotation: 0, w: 3.8, h: 0.3, height: 1.9 },
      { id: 'back', kind: 'wall', x: 5.45, y: 0, rotation: 0, w: 0.3, h: 1.6, height: 1.9 },
    ],
    inventory: { lens: 1 },
    templates: { lens: { focal: 2, len: 1.2 } },
    images: [{ screen: 'sensor', object: 'obj', maxBlur: 0.05 }],
    par: 1,
    bonus: { description: 'Razor sharp: blur below 0.04', maxBlur: 0.04 },
    solution: { place: [{ item: 'lens', x: 2.5, y: 0, rotation: 0 }] },
    bonusSolution: { place: [{ item: 'lens', x: 2, y: 0, rotation: 0 }] },
  },];
