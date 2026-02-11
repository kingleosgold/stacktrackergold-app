import type { Metal } from '../types/holding';

export const METAL_COLORS: Record<Metal, string> = {
  gold: '#D4A843',
  silver: '#C0C0C0',
  platinum: '#7BB3D4',
  palladium: '#6BBF8A',
};

export const METAL_LABELS: Record<Metal, string> = {
  gold: 'Gold',
  silver: 'Silver',
  platinum: 'Platinum',
  palladium: 'Palladium',
};

export const METAL_SYMBOLS: Record<Metal, string> = {
  gold: 'Au',
  silver: 'Ag',
  platinum: 'Pt',
  palladium: 'Pd',
};

export const METALS: Metal[] = ['gold', 'silver', 'platinum', 'palladium'];
