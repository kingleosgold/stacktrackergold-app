import type { Holding, HoldingFormData, WeightUnit } from '../types/holding';
import { WEIGHT_CONVERSIONS } from '../types/holding';

const STORAGE_KEY = 'stacktracker_holdings';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function convertToTroyOz(weight: number, unit: WeightUnit): number {
  return weight * WEIGHT_CONVERSIONS[unit];
}

export function getHoldings(): Holding[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    console.error('Failed to load holdings from localStorage');
    return [];
  }
}

function saveHoldings(holdings: Holding[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings));
  } catch (error) {
    console.error('Failed to save holdings to localStorage:', error);
    throw new Error('Failed to save holdings');
  }
}

export function addHolding(formData: HoldingFormData): Holding {
  const holdings = getHoldings();
  const now = new Date().toISOString();

  const holding: Holding = {
    id: generateId(),
    metal: formData.metal,
    type: formData.type,
    weight: convertToTroyOz(formData.weight, formData.weightUnit),
    weightUnit: formData.weightUnit,
    quantity: formData.quantity,
    purchasePrice: formData.purchasePrice,
    purchaseDate: formData.purchaseDate,
    notes: formData.notes || undefined,
    createdAt: now,
    updatedAt: now,
  };

  holdings.push(holding);
  saveHoldings(holdings);
  return holding;
}

export function updateHolding(id: string, updates: Partial<HoldingFormData>): Holding {
  const holdings = getHoldings();
  const index = holdings.findIndex((h) => h.id === id);

  if (index === -1) {
    throw new Error(`Holding with id ${id} not found`);
  }

  const existing = holdings[index];
  const updated: Holding = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  // Recalculate weight in troy oz if weight or unit changed
  if (updates.weight !== undefined || updates.weightUnit !== undefined) {
    const weight = updates.weight ?? existing.weight;
    const unit = updates.weightUnit ?? existing.weightUnit;
    updated.weight = convertToTroyOz(weight, unit);
    updated.weightUnit = unit;
  }

  holdings[index] = updated;
  saveHoldings(holdings);
  return updated;
}

export function deleteHolding(id: string): void {
  const holdings = getHoldings();
  const filtered = holdings.filter((h) => h.id !== id);

  if (filtered.length === holdings.length) {
    throw new Error(`Holding with id ${id} not found`);
  }

  saveHoldings(filtered);
}

export function exportToCSV(): string {
  const holdings = getHoldings();

  if (holdings.length === 0) {
    return '';
  }

  const headers = [
    'Metal',
    'Type',
    'Weight (oz)',
    'Quantity',
    'Total Oz',
    'Purchase Price',
    'Purchase Date',
    'Notes',
    'Created At',
  ];

  const rows = holdings.map((h) => [
    h.metal,
    h.type,
    h.weight.toFixed(4),
    h.quantity.toString(),
    (h.weight * h.quantity).toFixed(4),
    h.purchasePrice.toFixed(2),
    h.purchaseDate,
    h.notes || '',
    h.createdAt,
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  return csvContent;
}

export function importFromCSV(csv: string): Holding[] {
  const lines = csv.trim().split('\n');

  if (lines.length < 2) {
    throw new Error('CSV must have a header row and at least one data row');
  }

  const holdings = getHoldings();
  const imported: Holding[] = [];
  const now = new Date().toISOString();

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Simple CSV parsing (handles quoted fields)
    const cells = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
    const values = cells.map((cell) => cell.replace(/^"|"$/g, '').trim());

    if (values.length < 6) {
      console.warn(`Skipping row ${i + 1}: not enough columns`);
      continue;
    }

    const [metal, type, weight, quantity, , purchasePrice, purchaseDate, notes] = values;

    const holding: Holding = {
      id: generateId(),
      metal: metal.toLowerCase() as Holding['metal'],
      type: type,
      weight: parseFloat(weight) || 0,
      weightUnit: 'oz',
      quantity: parseInt(quantity, 10) || 1,
      purchasePrice: parseFloat(purchasePrice) || 0,
      purchaseDate: purchaseDate || now.split('T')[0],
      notes: notes || undefined,
      createdAt: now,
      updatedAt: now,
    };

    imported.push(holding);
  }

  // Merge with existing holdings
  const merged = [...holdings, ...imported];
  saveHoldings(merged);

  return imported;
}

export function clearAllHoldings(): void {
  saveHoldings([]);
}
