/** Chapter 5: Waves & polarisation. */
import type { LevelDef } from '../../game/level';
import { TABLE } from './common';

export const CHAPTER5: LevelDef[] = [
  {
    id: '5-1',
    chapter: 5,
    title: 'Double Slit',
    intro: [
      'Light is a wave! Send a laser through two tiny slits, 20 µm apart, and look at the screen.',
      'Instead of two spots you get a row of bright and dark stripes: interference fringes.',
      'Slide the screen until the fringes match the white reference ticks: a spacing of 0.20.',
    ],
    hints: [
      'The further the screen, the wider the fringes spread out.',
      'Fringe spacing = λ·L/d. Here λ = 532 nm and d = 20 µm, so the spacing is L/37.6.',
      'You need L ≈ 7.5, so the screen goes at x ≈ 3.5. Anywhere from 3 to 4 is within 10%.',
    ],
    explanation: {
      title: 'Young\'s double slit',
      body:
        'Waves from the two slits overlap. Where their crests meet they add up (bright); where a crest meets a trough they cancel (dark). '
        + 'Thomas Young did this in 1801, and it convinced scientists that light is a wave.',
      deeper:
        'Bright fringes appear where the path difference d·sin θ = m·λ. For small angles the spacing on the screen is Δy = λL/d. '
        + 'The same pattern appears even when electrons or photons are sent through one at a time: a cornerstone of quantum physics.',
    },
    bounds: TABLE,
    elements: [
      { id: 'laser', kind: 'laser', x: -5.4, y: 0, rotation: 0, wavelength: 532 },
      { id: 'slits', kind: 'slits', x: -4, y: 0, rotation: 0, slitCount: 2, slitSep: 20, slitWidth: 4 },
      { id: 'screen', kind: 'screen', x: 0, y: 0, rotation: 0, len: 2.4, movable: true },
    ],
    inventory: {},
    patterns: [{ screen: 'screen', spacing: 0.2, tolerance: 0.1 }],
    par: 0,
    bonus: { description: 'Match the fringes within 1%', patternTolerance: 0.01 },
    solution: { place: [], move: { screen: { x: 3, y: 0 } } },
    bonusSolution: { place: [], move: { screen: { x: 3.5, y: 0 } } },
  },
  {
    id: '5-2',
    chapter: 5,
    title: 'Single Slit',
    intro: [
      'Even one slit makes a pattern: a wide bright band in the middle with fainter bands beside it.',
      'Choose the right slit and place it so the central band is 1.04 wide (between the ticks).',
    ],
    hints: [
      'Narrower slits spread the light out MORE. That\'s diffraction.',
      'Central band width W = 2·λ·L/a with λ = 650 nm. The 20 µm slit can\'t make it wide enough on this table.',
      'Use the 10 µm slit, 8 units from the screen: at (−3.5, 0).',
    ],
    explanation: {
      title: 'Diffraction',
      body:
        'When light squeezes through an opening not much wider than its wavelength, it spreads out. The narrower the slit, '
        + 'the wider the pattern. That\'s why a single slit doesn\'t simply cast a sharp shadow.',
      deeper:
        'Dark bands appear where a·sin θ = m·λ (m = ±1, ±2…), so the central band is W = 2λL/a wide. Diffraction limits how sharp any '
        + 'lens image can be: telescopes and microscopes can\'t resolve details much smaller than about λ divided by their aperture angle.',
    },
    bounds: TABLE,
    elements: [
      { id: 'laser', kind: 'laser', x: -5.4, y: 0, rotation: 0, wavelength: 650 },
      { id: 'screen', kind: 'screen', x: 4.5, y: 0, rotation: 0, len: 2.4 },
    ],
    inventory: { slit10: 1, slit20: 1 },
    templates: {
      slit10: { kind: 'slits', slitCount: 1, slitWidth: 10, label: 'Slit 10 µm' },
      slit20: { kind: 'slits', slitCount: 1, slitWidth: 20, label: 'Slit 20 µm' },
    },
    patterns: [{ screen: 'screen', centralWidth: 1.04, tolerance: 0.1 }],
    par: 1,
    bonus: { description: 'Match the width within 1%', patternTolerance: 0.01 },
    solution: { place: [{ item: 'slit10', x: -3, y: 0, rotation: 0 }] },
    bonusSolution: { place: [{ item: 'slit10', x: -3.5, y: 0, rotation: 0 }] },
  },
  {
    id: '5-3',
    chapter: 5,
    title: 'Three Polarisers',
    intro: [
      'The laser light is polarised: its wave wiggles in one direction. A polariser only lets one wiggle direction through.',
      'These two polarisers are crossed (0° and 90°): no light gets through. Can adding MORE polarisers let light through?',
    ],
    hints: [
      'A polariser in between at 45° lets 1/4 of the light through. That\'s not quite enough here.',
      'Turning the light in smaller steps loses less light each time.',
      'Use two in between: 30° then 60° (or 45° with one of them for 35%).',
    ],
    explanation: {
      title: 'Polarisation and Malus\'s law',
      body:
        'Each polariser keeps only the part of the wave along its axis. Crossed polarisers block everything, but a polariser in between '
        + 'turns the light part of the way, so some gets through the last one. Polarised sunglasses and LCD screens use this.',
      deeper:
        'Malus\'s law: I = I₀·cos²θ for an angle θ between the light\'s polarisation and the polariser axis. '
        + 'One 45° polariser in between: cos²45° · cos²45° = 25%. Two steps of 30°: (cos²30°)³ = 42%. With many small steps you approach 100%.',
    },
    bounds: TABLE,
    elements: [
      { id: 'laser', kind: 'laser', x: -5, y: 0, rotation: 0, wavelength: 532, pol: 0 },
      { id: 'polA', kind: 'polariser', x: -3.5, y: 0, rotation: 0, pol: 0 },
      { id: 'polB', kind: 'polariser', x: 3.5, y: 0, rotation: 0, pol: 90 },
      { id: 'target', kind: 'target', x: 5.2, y: 0, rotation: 0, r: 0.35, minPower: 0.3 },
    ],
    inventory: { pol30: 1, pol45: 1, pol60: 1 },
    par: 2,
    bonus: { description: 'Get at least 40% of the light through', minPower: { target: 0.4 } },
    solution: {
      place: [
        { item: 'pol30', x: -1, y: 0, rotation: 0 },
        { item: 'pol45', x: 1, y: 0, rotation: 0 },
      ],
    },
    bonusSolution: {
      place: [
        { item: 'pol30', x: -1, y: 0, rotation: 0 },
        { item: 'pol60', x: 1, y: 0, rotation: 0 },
      ],
    },
  },
  {
    id: '5-4',
    chapter: 5,
    title: 'Beam Steering',
    intro: [
      'Meet the spatial light modulator (SLM): a tiny screen of a million pixels that can each delay light a bit.',
      'Select it and press Q or E to change its program. It steers the beam without moving! Light the receiver on the right.',
    ],
    hints: [
      'A "ramp" program acts like a tilted mirror plus a grating: it bends the reflected beam to one side.',
      'Shorter ramp periods bend the beam more. Try the 3 µm programs.',
      '"Ramp + 3 µm" lights the receiver. For the bonus, "Split ± 3 µm" sends light both ways at once.',
    ],
    explanation: {
      title: 'Spatial light modulators',
      body:
        'An SLM changes the phase of the light pixel by pixel. A repeating ramp acts like a blazed grating and steers the beam; '
        + 'other patterns can split, focus or shape it. They\'re used in holographic displays, optical tweezers and laboratory beam control.',
      deeper:
        'The phase ramp with period Λ adds m·λ/Λ to the sine of the reflection angle, like a grating with d = Λ. '
        + 'A blazed (sawtooth) ramp sends almost all light into one order; a binary (two-level) pattern splits it into ±1 orders, about 40% each.',
    },
    bounds: TABLE,
    elements: [
      { id: 'laser', kind: 'laser', x: -5, y: -2.5, rotation: 0, wavelength: 532 },
      { id: 'slm', kind: 'slm', x: 0, y: -2.5, rotation: 45, program: 0, rotatable: true },
      { id: 'receiver', kind: 'target', x: 1.855, y: 3.5, rotation: 0, r: 0.3, minPower: 0.3 },
      { id: 'ring', kind: 'ring', x: -1.386, y: 3.5, rotation: 0, r: 0.3 },
    ],
    inventory: {},
    par: 0,
    bonus: { description: 'At the same time, send light through the ring on the left', ringIds: ['ring'] },
    solution: { place: [], program: { slm: 2 } },
    bonusSolution: { place: [], program: { slm: 7 } },
  },
];
