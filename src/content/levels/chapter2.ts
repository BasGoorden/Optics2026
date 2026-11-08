/** Chapter 2: Refraction. */
import type { LevelDef } from '../../game/level';
import { TABLE } from './common';

export const CHAPTER2: LevelDef[] = [
  {
    id: '2-1',
    chapter: 2,
    title: 'Glass Shift',
    intro: [
      'Light changes direction when it enters glass. We call that refraction.',
      'Rotate the glass block to shift the beam sideways onto the receiver. Turn on the overlay (F) to see Snell\'s law at work.',
    ],
    hints: [
      'When the beam hits the glass head-on, nothing bends. Try tilting the block.',
      'The beam bends towards the normal going into the glass, and away from it coming out. It leaves parallel, but shifted.',
      'Rotate the block to about −45°.',
    ],
    explanation: {
      title: 'Refraction and Snell\'s law',
      body:
        'Light travels slower in glass than in air. When it enters at an angle, it bends towards the normal; '
        + 'when it leaves, it bends away again. A flat block therefore shifts the beam sideways without changing its direction.',
      deeper:
        'Snell\'s law: n₁ sin θ₁ = n₂ sin θ₂, with n = c/v the refractive index (air ≈ 1.00, this glass 1.50). '
        + 'A block of thickness t shifts the beam by d = t·sin(θ₁ − θ₂)/cos θ₂.',
    },
    bounds: TABLE,
    elements: [
      { id: 'laser', kind: 'laser', x: -5, y: 0, rotation: 0 },
      { id: 'block', kind: 'block', x: 0, y: 0, rotation: 0, w: 2, h: 3, index: 1.5, rotatable: true },
      { id: 'target', kind: 'target', x: 5, y: -0.6, rotation: 0 },
      { id: 'ring', kind: 'ring', x: 3, y: -0.9, rotation: 0, r: 0.15 },
    ],
    inventory: {},
    par: 0,
    bonus: { description: 'Shift the beam just enough to pass through the small ring', ringIds: ['ring'] },
    solution: { place: [], rotate: { block: -45 } },
    bonusSolution: { place: [], rotate: { block: -55 } },
  },
  {
    id: '2-2',
    chapter: 2,
    title: 'Trapped Light',
    intro: [
      'No mirrors left. All we have are two glass prisms.',
      'Glass can reflect perfectly too, if the light hits the inside surface at a steep enough angle. Use the prisms to bring the beam to the receiver.',
    ],
    hints: [
      'Let the beam enter a short side of the prism head-on, so it hits the long side from inside.',
      'At 45° inside the glass, the light can\'t escape. It reflects completely and turns 90°.',
      'Put a prism at (2, −3) at 0° and one at (2.5, 2) at 90°.',
    ],
    explanation: {
      title: 'Total internal reflection',
      body:
        'Going from glass to air, light bends away from the normal. Beyond the critical angle it can\'t get out at all '
        + 'and is reflected completely: total internal reflection. Optical fibres carry internet data this way.',
      deeper:
        'Critical angle: sin θc = n₂/n₁. For glass (n = 1.50) to air: θc = arcsin(1/1.5) ≈ 41.8°. '
        + 'In a 45° prism the beam hits the long side at 45° > θc, so 100% is reflected. That\'s better than most mirrors!',
    },
    bounds: TABLE,
    elements: [
      { id: 'laser', kind: 'laser', x: -5, y: -3, rotation: 0 },
      { id: 'wall', kind: 'wall', x: -3.5, y: 0, rotation: 0, w: 4, h: 0.5 },
      { id: 'target', kind: 'target', x: -4, y: 2.5, rotation: 0 },
      { id: 'ring', kind: 'ring', x: 4, y: 0, rotation: 0 },
    ],
    inventory: { prism: 2 },
    par: 2,
    bonus: { description: 'Send the beam through the bonus ring', ringIds: ['ring'] },
    solution: {
      place: [
        { kind: 'prism', x: 2, y: -3, rotation: 0 },
        { kind: 'prism', x: 2.5, y: 2, rotation: 90 },
      ],
    },
    bonusSolution: {
      place: [
        { kind: 'prism', x: 3.5, y: -3, rotation: 0 },
        { kind: 'prism', x: 4, y: 2, rotation: 90 },
      ],
    },
  },
  {
    id: '2-3',
    chapter: 2,
    title: 'Light Pipe',
    intro: [
      'This glass rod is an optical fibre. It can carry light through the shielded tunnel to the receiver.',
      'The laser is bolted down, but you can aim it. Get the light into the end of the rod!',
    ],
    hints: [
      'The beam has to enter the rod through its left end, the narrow face.',
      'Inside, the light hits the sides at a steep angle and is trapped by total internal reflection.',
      'Rotate the laser to about 35°.',
    ],
    explanation: {
      title: 'Optical fibres',
      body:
        'Once light is inside the fibre, it hits the walls beyond the critical angle and bounces all the way along, '
        + 'even around gentle bends. The internet runs on this: pulses of light in glass fibres thinner than a hair.',
      deeper:
        'Light entering the end at angle θ refracts to θ₂ with sin θ₂ = sin θ / n. It then meets the side wall at 90° − θ₂. '
        + 'For n = 1.5 that is always more than θc = 41.8°, so any ray that gets in stays in. '
        + 'Real fibres use a core and a cladding with slightly lower n, which sets the numerical aperture NA = √(n_core² − n_clad²).',
    },
    bounds: TABLE,
    elements: [
      { id: 'laser', kind: 'laser', x: -5, y: -1.5, rotation: 0, rotatable: true },
      { id: 'rod', kind: 'block', x: 0.5, y: 0, rotation: 0, w: 7, h: 0.6, index: 1.5 },
      { id: 'w1', kind: 'wall', x: 0.5, y: 0.9, rotation: 0, w: 6, h: 0.5, height: 0.25 },
      { id: 'w2', kind: 'wall', x: 0.5, y: -0.9, rotation: 0, w: 6, h: 0.5, height: 0.25 },
      { id: 'target', kind: 'target', x: 4.6, y: 0, rotation: 0 },
      { id: 'ring', kind: 'ring', x: 1.05, y: -0.2, rotation: 0, r: 0.15 },
    ],
    inventory: {},
    par: 0,
    bonus: { description: 'Make the light bounce through the ring inside the fibre', ringIds: ['ring'] },
    solution: { place: [], rotate: { laser: 35 } },
    bonusSolution: { place: [], rotate: { laser: 40 } },
  },
];
