/** Chapter 4: Colour & dispersion. */
import type { LevelDef } from '../../game/level';
import { BANDS, WHITE } from '../../physics/colour';
import { TABLE } from './common';

const ALL_BUT = (keep: [number, number]): [number, number][] =>
  [[380, keep[0] - 1], [keep[1] + 1, 780]] as [number, number][];

export const CHAPTER4: LevelDef[] = [
  {
    id: '4-1',
    chapter: 4,
    title: 'Rainbow Maker',
    intro: [
      'This lamp makes white light: all colours mixed together.',
      'Glass bends blue light a little more than red light. Turn the flint-glass prism to split the colours, and send red light to the red receiver.',
    ],
    hints: [
      'At most angles the light just bounces around inside the prism. Find the angle where a fan of colours comes out.',
      'Look for the rainbow leaving the prism towards the upper right, then fine-tune.',
      'Around 80° works. For the bonus, fine-tune to 85° so blue goes through the tiny ring.',
    ],
    explanation: {
      title: 'Dispersion',
      body:
        'The refractive index of glass depends on the colour: blue light travels a bit slower in glass than red light, so it bends more. '
        + 'A prism separates white light into a spectrum. Raindrops do the same, which is why you see rainbows.',
      deeper:
        'Cauchy\'s equation n(λ) = A + B/λ² describes this. For this flint glass A = 1.62 and B = 0.02 µm², '
        + 'so n is about 1.72 for blue (450 nm) and 1.67 for red (650 nm). Newton first showed with prisms that white light is a mixture of colours.',
    },
    bounds: TABLE,
    elements: [
      { id: 'lamp', kind: 'laser', x: -5, y: -2, rotation: 0, spectrum: WHITE, pol: null },
      { id: 'prism', kind: 'dprism', x: -1.5, y: -2, rotation: 0, rotatable: true },
      { id: 'red', kind: 'target', x: 2.65, y: 3.5, rotation: 0, r: 0.3, needs: [{ band: BANDS.red, min: 0.05 }] },
      { id: 'ring', kind: 'ring', x: 1.91, y: 3.5, rotation: 0, r: 0.05, needs: [{ band: BANDS.blue, min: 0.05 }] },
    ],
    inventory: {},
    par: 0,
    bonus: { description: 'Also send blue light through the tiny ring', ringIds: ['ring'] },
    solution: { place: [], rotate: { prism: 80 } },
    bonusSolution: { place: [], rotate: { prism: 85 } },
  },
  {
    id: '4-2',
    chapter: 4,
    title: 'Colour Filters',
    intro: [
      'These receivers are picky: one only wants pure blue light, the other only pure green. Any other colour sets off their alarm.',
      'Use colour filters to take the unwanted colours out of the white light.',
    ],
    hints: [
      'A filter lets its own colour through and absorbs all the others.',
      'Each receiver needs the filter of its own colour somewhere in its beam.',
      'Blue filter on the upward beam (rotate it 90°), green filter on the beam to the right. For the bonus, put the blue filter before the ring.',
    ],
    explanation: {
      title: 'Colour filters',
      body:
        'A coloured filter doesn\'t add colour: it removes every colour except its own. White light through a green filter is green '
        + 'because the red and blue have been absorbed. That\'s also why light through two different filters (say red then green) is dark.',
      deeper:
        'Real filters have a transmission spectrum T(λ). Absorption filters use dyes. Interference filters use thin layers that '
        + 'reflect the unwanted colours instead, which is how the dichroic mirror in the next level works.',
    },
    bounds: TABLE,
    elements: [
      { id: 'lamp', kind: 'laser', x: -5, y: 0, rotation: 0, spectrum: WHITE, pol: null },
      { id: 'cube', kind: 'splitter', x: -2, y: 0, rotation: 45 },
      { id: 'blue', kind: 'target', x: -2, y: 3.3, rotation: 0, r: 0.35, needs: [{ band: BANDS.blue, min: 0.03 }], forbid: ALL_BUT(BANDS.blue) },
      { id: 'green', kind: 'target', x: 4.5, y: 0, rotation: 0, r: 0.35, needs: [{ band: BANDS.green, min: 0.03 }], forbid: ALL_BUT(BANDS.green) },
      { id: 'ring', kind: 'ring', x: -2, y: 2, rotation: 0, r: 0.2, needs: [{ band: BANDS.blue, min: 0.03 }], forbid: ALL_BUT(BANDS.blue) },
    ],
    inventory: { filterR: 1, filterG: 1, filterB: 1 },
    par: 2,
    bonus: { description: 'Only blue light may pass through the gold ring', ringIds: ['ring'] },
    solution: {
      place: [
        { item: 'filterB', x: -2, y: 2.5, rotation: 90 },
        { item: 'filterG', x: 1.5, y: 0, rotation: 0 },
      ],
    },
    bonusSolution: {
      place: [
        { item: 'filterB', x: -2, y: 1, rotation: 90 },
        { item: 'filterG', x: 1.5, y: 0, rotation: 0 },
      ],
    },
  },
  {
    id: '4-3',
    chapter: 4,
    title: 'Mixing Colours',
    intro: [
      'This receiver wants yellow light. We only have a red laser and a green laser.',
      'For light, red + green = yellow! Combine both beams into one.',
    ],
    hints: [
      'Both beams must end up travelling together to the receiver.',
      'A beam splitter works as a beam combiner too, but you lose half of each beam. A dichroic mirror reflects green and lets red through.',
      'Put the combiner where the beams cross, at (−1, −2), at 45°. The dichroic mirror gets the bonus.',
    ],
    explanation: {
      title: 'Additive colour mixing',
      body:
        'Mixing light adds colours: red + green looks yellow, red + green + blue looks white. Screens use tiny red, green and blue pixels to make every colour. '
        + 'A dichroic mirror combines colours without losing light, because it reflects one colour and transmits the other.',
      deeper:
        'Our eyes have three kinds of colour receptors (cones). Yellow light (≈580 nm) and a red + green mixture stimulate them in nearly the same way, '
        + 'so they look the same: this is called metamerism. Dichroic mirrors are stacks of thin layers using interference.',
    },
    bounds: TABLE,
    elements: [
      { id: 'red', kind: 'laser', x: -5, y: -2, rotation: 0, wavelength: 650 },
      { id: 'green', kind: 'laser', x: -1, y: -3.5, rotation: 90, wavelength: 532 },
      {
        id: 'yellow', kind: 'target', x: 5, y: -2, rotation: 0, r: 0.4,
        needs: [{ band: BANDS.red, min: 0.3 }, { band: BANDS.green, min: 0.3 }],
      },
    ],
    inventory: { splitter: 1, dichroicG: 1 },
    par: 1,
    bonus: { description: 'Deliver at least 90% of both beams', minPower: { yellow: 1.8 } },
    solution: { place: [{ item: 'splitter', x: -1, y: -2, rotation: 45 }] },
    bonusSolution: { place: [{ item: 'dichroicG', x: -1, y: -2, rotation: 45 }] },
  },
  {
    id: '4-4',
    chapter: 4,
    title: 'Spectrometer',
    intro: [
      'A diffraction grating has thousands of tiny lines. It splits white light into colours too, but by a different trick than a prism.',
      'Place the grating in the white beam so the first-order rainbow hits the blue and red receivers.',
    ],
    hints: [
      'The grating sends each colour off at its own angle, on both sides of the straight-through beam.',
      'Red bends more than blue here: the opposite of a prism! Slide the grating along the beam until both receivers light up.',
      'Grating at (−1, −2) works. For the bonus, aim the other side\'s green light at the ring: try (−1.5, −2).',
    ],
    explanation: {
      title: 'Diffraction gratings',
      body:
        'Light passing through many narrow slits interferes. Only in certain directions do the waves add up, and those directions depend on the wavelength. '
        + 'Spectrometers use gratings to measure which colours a lamp, a star or a chemical gives off.',
      deeper:
        'Grating equation: d·sin θ = m·λ, with line spacing d and order m = 0, ±1, ±2… With d = 2 µm, blue (450 nm) leaves at 13° '
        + 'and red (650 nm) at 19°. Longer wavelengths are bent more, the opposite of a prism.',
    },
    bounds: TABLE,
    elements: [
      { id: 'lamp', kind: 'laser', x: -5, y: -2, rotation: 0, spectrum: WHITE, pol: null },
      { id: 'blue', kind: 'target', x: 4, y: -0.85, rotation: 0, r: 0.2, needs: [{ band: BANDS.blue, min: 0.03 }] },
      { id: 'red', kind: 'target', x: 4, y: -0.28, rotation: 0, r: 0.2, needs: [{ band: BANDS.red, min: 0.03 }] },
      { id: 'ring', kind: 'ring', x: 4, y: -3.51, rotation: 0, r: 0.1, needs: [{ band: BANDS.green, min: 0.03 }] },
    ],
    inventory: { grating: 1 },
    par: 1,
    bonus: { description: 'Also send green light (order −1) through the ring', ringIds: ['ring'] },
    solution: { place: [{ item: 'grating', x: -1, y: -2, rotation: 0 }] },
    bonusSolution: { place: [{ item: 'grating', x: -1.5, y: -2, rotation: 0 }] },
  },
];
