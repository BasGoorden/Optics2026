/**
 * All levels, one file per chapter. Geometry + all player-facing text for each level.
 * Every level has a known solution and bonus solution, checked by tests.
 */
import type { LevelDef } from '../../game/level';
import { CHAPTER1 } from './chapter1';
import { CHAPTER2 } from './chapter2';
import { CHAPTER3 } from './chapter3';
import { CHAPTER4 } from './chapter4';

export const CHAPTERS = [
  { id: 1, title: 'Reflection', subtitle: 'Mirrors and beam splitters' },
  { id: 2, title: 'Refraction', subtitle: 'Bending light with glass' },
  { id: 3, title: 'Lenses & Imaging', subtitle: 'Focusing light and forming images' },
  { id: 4, title: 'Colour', subtitle: 'Prisms, filters, mixing and gratings' },
];

export const LEVELS: LevelDef[] = [...CHAPTER1, ...CHAPTER2, ...CHAPTER3, ...CHAPTER4];