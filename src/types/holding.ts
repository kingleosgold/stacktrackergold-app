export type Metal = 'gold' | 'silver' | 'platinum' | 'palladium';
export type WeightUnit = 'oz' | 'g' | 'kg';

export interface Holding {
  id: string;
  metal: Metal;
  type: string;
  weight: number; // Always stored in troy oz
  weightUnit: WeightUnit; // Original unit for display
  quantity: number;
  purchasePrice: number; // Price per item
  purchaseDate: string; // ISO date string
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HoldingFormData {
  metal: Metal;
  type: string;
  weight: number;
  weightUnit: WeightUnit;
  quantity: number;
  purchasePrice: number;
  purchaseDate: string;
  notes?: string;
}

// Common product types by metal
export const PRODUCT_TYPES: Record<Metal, string[]> = {
  gold: [
    'American Eagle',
    'American Buffalo',
    'Canadian Maple Leaf',
    'South African Krugerrand',
    'Austrian Philharmonic',
    'Australian Kangaroo',
    'Chinese Panda',
    'British Britannia',
    'Bar',
    'Round',
    'Other',
  ],
  silver: [
    'American Eagle',
    'Canadian Maple Leaf',
    'Austrian Philharmonic',
    'Australian Kangaroo',
    'British Britannia',
    'Morgan Dollar',
    'Peace Dollar',
    'Constitutional/Junk Silver',
    'Bar',
    'Round',
    'Other',
  ],
  platinum: [
    'American Eagle',
    'Canadian Maple Leaf',
    'Australian Platypus',
    'Bar',
    'Other',
  ],
  palladium: [
    'Canadian Maple Leaf',
    'Bar',
    'Other',
  ],
};

// Weight conversion constants (to troy oz)
export const WEIGHT_CONVERSIONS: Record<WeightUnit, number> = {
  oz: 1,
  g: 0.0321507, // 1 gram = 0.0321507 troy oz
  kg: 32.1507,  // 1 kg = 32.1507 troy oz
};
