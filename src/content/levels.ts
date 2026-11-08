/**
 * All levels. Geometry + all player-facing text for each level.
 * Every level has a known solution and bonus solution, checked by tests.
 */
import type { LevelDef } from '../game/level';

const TABLE = { minX: -6, maxX: 6, minY: -4, maxY: 4 };

export const CHAPTERS = [
  { id: 1, title: 'Reflection', subtitle: 'Mirrors and beam splitters' },
  { id: 2, title: 'Refraction', subtitle: 'Bending light with glass' },
];

export const LEVELS: LevelDef[] = [
  {
    id: '1-1',
    chapter: 1,
    title: 'First Light',
    intro: [
      'Welcome aboard, cadet! I\'m Lumen, the station\'s optics assistant.',
      'Our laser can\'t reach the receiver. Take a mirror from the tray below and place it in the beam.',
      'Rotate it with Q and E or by scrolling over it: 5° per step, or 1° while you hold Shift. Drag to move it.',
      'Want the third star? Look at the selected mirror\'s angle at the bottom of the screen and fine-tune until the beam threads the gold ring.',
    ],
    hints: [
      'The beam travels in a straight line until it hits something. Where must the mirror go to catch it?',
      'Put the mirror where the beam line and the receiver line cross: right below the receiver.',
      'Place the mirror at the crossing point and rotate it to 45°.',
    ],
    explanation: {
      title: 'The law of reflection',
      body:
        'A mirror reflects light so that the angle of incidence equals the angle of reflection. '
        + 'Both angles are measured from the normal: the line perpendicular to the mirror.',
      deeper:
        'θᵢ = θᵣ. If you rotate a mirror by an angle α, the reflected beam turns by 2α. '
        + 'In vector form: r = d − 2(d·n)n, where d is the incoming direction and n the unit normal.',
    },
    bounds: TABLE,
    elements: [
      { id: 'laser', kind: 'laser', x: -5, y: -2, rotation: 0 },
      { id: 'target', kind: 'target', x: 2, y: 3, rotation: 0 },
      { id: 'ring', kind: 'ring', x: 0, y: 0.5, rotation: 0, r: 0.3 },
    ],
    inventory: { mirror: 1 },
    par: 1,
    bonus: { description: 'Send the beam through the bonus ring', ringIds: ['ring'] },
    solution: { place: [{ kind: 'mirror', x: 2, y: -2, rotation: 45 }] },
    bonusSolution: { place: [{ kind: 'mirror', x: -2, y: -2, rotation: 25 }] },
  },
  {
    id: '1-2',
    chapter: 1,
    title: 'Around the Wall',
    intro: [
      'A shielding wall blocks the direct route.',
      'One mirror won\'t be enough this time. Can you steer the beam around the wall with two?',
    ],
    hints: [
      'Go under the wall: the gap is at the bottom of the table.',
      'Turn the beam down first, then turn it right towards the receiver.',
      'Place one mirror at (−2, 3) and another at (−2, −2), both at −45° (135°).',
    ],
    explanation: {
      title: 'Steering with mirrors',
      body:
        'Every mirror turns the beam by twice the angle between the beam and the mirror surface. '
        + 'Two mirrors at 45° make a periscope: the beam comes out parallel to how it went in, just shifted.',
      deeper:
        'Two reflections in mirrors at an angle β to each other rotate the beam by 2β in total, '
        + 'whatever the angle of incidence. For parallel mirrors β = 0, so the beam leaves parallel to how it entered.',
    },
    bounds: TABLE,
    elements: [
      { id: 'laser', kind: 'laser', x: -5, y: 3, rotation: 0 },
      { id: 'wall', kind: 'wall', x: 1, y: 1.25, rotation: 0, w: 0.5, h: 5.5 },
      { id: 'target', kind: 'target', x: 4, y: -2, rotation: 0 },
      { id: 'ring', kind: 'ring', x: 0, y: -3, rotation: 0 },
    ],
    inventory: { mirror: 3 },
    par: 2,
    bonus: { description: 'Send the beam through the bonus ring', ringIds: ['ring'] },
    solution: {
      place: [
        { kind: 'mirror', x: -2, y: 3, rotation: -45 },
        { kind: 'mirror', x: -2, y: -2, rotation: -45 },
      ],
    },
    bonusSolution: {
      place: [
        { kind: 'mirror', x: -2, y: 3, rotation: -45 },
        { kind: 'mirror', x: -2, y: -3.5, rotation: -40 },
      ],
    },
  },
  {
    id: '1-3',
    chapter: 1,
    title: 'Angle of Attack',
    intro: [
      'These mirrors are bolted to the table, but you can still rotate them.',
      'Press F to show the physics overlay. It shows the normal and both angles at every mirror.',
    ],
    hints: [
      'Follow the beam one mirror at a time. Each mirror only has to send the beam to the next one.',
      'To turn a beam by 90°, the mirror must sit at 45° to it.',
      'Bottom-right mirror 45°, top-right 135°, top-left 45°.',
    ],
    explanation: {
      title: 'Angle in = angle out',
      body:
        'At each mirror the angle between the incoming beam and the normal equals the angle between '
        + 'the reflected beam and the normal. Find the angle that sends the beam where you want it, and the mirror angle follows.',
      deeper:
        'To turn a beam from direction φ₁ to φ₂, the mirror surface must be at α = (φ₁ + φ₂)/2. '
        + 'That\'s why a mirror at 45° turns a horizontal beam by 90°.',
    },
    bounds: TABLE,
    elements: [
      { id: 'laser', kind: 'laser', x: -5, y: -3, rotation: 0 },
      { id: 'm1', kind: 'mirror', x: 3, y: -3, rotation: 90, rotatable: true },
      { id: 'm2', kind: 'mirror', x: 3, y: 2, rotation: 0, rotatable: true },
      { id: 'm3', kind: 'mirror', x: -3, y: 2, rotation: 0, rotatable: true },
      { id: 'target', kind: 'target', x: -3, y: -1, rotation: 0 },
      { id: 'ring', kind: 'ring', x: 0, y: -0.5, rotation: 0 },
    ],
    inventory: {},
    par: 0,
    bonus: { description: 'Thread the beam through the bonus ring (hint: skip a mirror)', ringIds: ['ring'] },
    solution: { place: [], rotate: { m1: 45, m2: 135, m3: 45 } },
    bonusSolution: { place: [], rotate: { m1: 70, m3: 25 } },
  },
  {
    id: '1-4',
    chapter: 1,
    title: 'Split Decision',
    intro: [
      'Two receivers, one laser. Time for a new tool: the beam splitter.',
      'It\'s a half-silvered glass plate. Half of the light reflects like a mirror, the other half goes straight through.',
    ],
    hints: [
      'One receiver is straight ahead. The other one needs the reflected half of the beam.',
      'A splitter at 45° turns the reflected half by 90°, just like a mirror.',
      'Put the splitter at (1, 0) and rotate it to 45°.',
    ],
    explanation: {
      title: 'Beam splitters',
      body:
        'A beam splitter divides one beam into two: here 50% is reflected and 50% transmitted. The reflected part '
        + 'follows the law of reflection, and the transmitted part carries on in a straight line. Energy is conserved: 50% + 50% = 100%.',
      deeper:
        'Real splitters use a thin metal or dielectric coating whose reflectance R sets the split: I_r = R·I and I_t = (1 − R)·I. '
        + 'Interferometers, such as the ones that detected gravitational waves, start with a beam splitter.',
    },
    bounds: TABLE,
    elements: [
      { id: 'laser', kind: 'laser', x: -5, y: 0, rotation: 0 },
      { id: 't1', kind: 'target', x: 5, y: 0, rotation: 0 },
      { id: 't2', kind: 'target', x: 1, y: 3.5, rotation: 0 },
      { id: 'ring', kind: 'ring', x: -1, y: 1.75, rotation: 0 },
    ],
    inventory: { splitter: 1, mirror: 1 },
    par: 1,
    bonus: { description: 'Light both receivers through the bonus ring, with only the splitter', ringIds: ['ring'] },
    solution: { place: [{ kind: 'splitter', x: 1, y: 0, rotation: 45 }] },
    bonusSolution: { place: [{ kind: 'splitter', x: -3, y: 0, rotation: 20 }] },
  },
  {
    id: '1-5',
    chapter: 1,
    title: 'Return to Sender',
    intro: [
      'The receiver sits right next to our laser, and a wall stops any shortcut.',
      'Can you send the light back the way it came?',
    ],
    hints: [
      'One mirror can\'t reverse the beam here. Two mirrors at a right angle to each other can.',
      'Turn the beam up with the first mirror, then back to the left with the second.',
      'Past the end of the wall: mirrors at (2, −2) at 45° and at (2, −0.5) at −45°.',
    ],
    explanation: {
      title: 'Corner reflectors',
      body:
        'Two mirrors at 90° to each other always send light back parallel to where it came from, whatever angle it arrives at. '
        + 'Bike reflectors and road signs use this trick. Astronauts left corner-cube reflectors on the Moon so scientists can bounce lasers off them.',
      deeper:
        'Each reflection turns the beam by 2× the angle between the beam and the mirror. With mirrors at angle β the total '
        + 'rotation is 2β, so for β = 90° the beam turns 180° for any incidence angle. A 3D corner cube does the same in all directions.',
    },
    bounds: TABLE,
    elements: [
      { id: 'laser', kind: 'laser', x: -5, y: -2, rotation: 0 },
      { id: 'wall', kind: 'wall', x: -2.4, y: -1.25, rotation: 0, w: 6.8, h: 0.3 },
      { id: 'target', kind: 'target', x: -5, y: -0.5, rotation: 0 },
      { id: 'ring', kind: 'ring', x: 5.5, y: -1.25, rotation: 0 },
    ],
    inventory: { mirror: 3 },
    par: 2,
    bonus: { description: 'Send the beam through the bonus ring at the far edge', ringIds: ['ring'] },
    solution: {
      place: [
        { kind: 'mirror', x: 2, y: -2, rotation: 45 },
        { kind: 'mirror', x: 2, y: -0.5, rotation: -45 },
      ],
    },
    bonusSolution: {
      place: [
        { kind: 'mirror', x: 5.5, y: -2, rotation: 45 },
        { kind: 'mirror', x: 5.5, y: -0.5, rotation: -45 },
      ],
    },
  },
  {
    id: '1-6',
    chapter: 1,
    title: 'Power Grid',
    intro: [
      'Three receivers need power, and we have one laser.',
      'Each splitter halves the beam, but even a quarter of the light is enough for a receiver.',
    ],
    hints: [
      'Split the beam once, then split one of the halves again.',
      'Send one half up to the receiver on the left, and let the other half continue to a second splitter.',
      'Splitters at (−1, −3) and (3, −3), both at 45°.',
    ],
    explanation: {
      title: 'Dividing light',
      body:
        'Every split divides the power: 100% → 50% + 50%, and a second split turns one half into 25% + 25%. '
        + 'Fibre-optic networks share one laser among many homes like this.',
      deeper:
        'After k 50/50 splits a branch carries (½)ᵏ of the power. In decibels each split costs 10·log₁₀(2) ≈ 3 dB. '
        + 'Engineers add up these losses in a "power budget" to check that every receiver still gets enough light.',
    },
    bounds: TABLE,
    elements: [
      { id: 'laser', kind: 'laser', x: -5, y: -3, rotation: 0 },
      { id: 't1', kind: 'target', x: 5, y: -3, rotation: 0 },
      { id: 't2', kind: 'target', x: -1, y: 3, rotation: 0 },
      { id: 't3', kind: 'target', x: 3, y: 3, rotation: 0 },
      { id: 'ring', kind: 'ring', x: 0, y: 0, rotation: 0 },
    ],
    inventory: { splitter: 2, mirror: 1 },
    par: 2,
    bonus: { description: 'Also send a beam through the bonus ring in the centre', ringIds: ['ring'] },
    solution: {
      place: [
        { kind: 'splitter', x: -1, y: -3, rotation: 45 },
        { kind: 'splitter', x: 3, y: -3, rotation: 45 },
      ],
    },
    bonusSolution: {
      place: [
        { kind: 'splitter', x: 1, y: -3, rotation: 55 },
        { kind: 'splitter', x: 3, y: -3, rotation: 45 },
      ],
    },
  },
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
  },];
