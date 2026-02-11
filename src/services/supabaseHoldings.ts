import { supabase } from '../lib/supabase';
import type { Holding, HoldingFormData } from '../types/holding';
import { WEIGHT_CONVERSIONS } from '../types/holding';

// Convert local holding to Supabase format
function toSupabaseHolding(holding: Holding, userId: string) {
  return {
    id: holding.id,
    user_id: userId,
    metal: holding.metal,
    type: holding.type,
    weight: holding.weight,
    weight_unit: holding.weightUnit,
    quantity: holding.quantity,
    purchase_price: holding.purchasePrice,
    purchase_date: holding.purchaseDate,
    notes: holding.notes || null,
    created_at: holding.createdAt,
    updated_at: holding.updatedAt,
  };
}

// Extract a clean product name from the type field.
// The Supabase column may contain a plain string, a JSON string, or a JSON
// object with metadata (local_id, source, cost_basis, etc.).
function cleanType(raw: unknown): string {
  if (raw == null) return 'Other';

  // Already a plain string – check if it's a JSON string
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (typeof parsed === 'object' && parsed !== null) {
          return parsed.name || parsed.type || parsed.label || 'Other';
        }
      } catch {
        // Not valid JSON – use as-is
      }
    }
    // Return only the first line (in case metadata is appended after newlines)
    return trimmed.split('\n')[0];
  }

  // If Supabase returned a JSONB object directly
  if (typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    return String(obj.name || obj.type || obj.label || 'Other');
  }

  return String(raw);
}

// Strip raw metadata / JSON from the notes field.
// The mobile app sometimes stores JSON metadata in notes (local_id, cost_basis, etc.).
function cleanNotes(raw: unknown): string | undefined {
  if (raw == null) return undefined;
  const str = typeof raw === 'string' ? raw.trim() : String(raw).trim();
  if (!str) return undefined;

  // If the entire notes field looks like JSON metadata, discard it
  if (str.startsWith('{') || str.startsWith('[')) {
    try {
      const parsed = JSON.parse(str);
      if (typeof parsed === 'object' && parsed !== null) {
        // Check for common metadata keys — if present, it's not a real note
        if ('local_id' in parsed || 'source' in parsed || 'cost_basis' in parsed || 'created_at' in parsed) {
          return undefined;
        }
      }
    } catch {
      // Not valid JSON — might be user-written text starting with { — keep it
    }
  }

  // Also strip if it contains telltale metadata substrings
  if (/\blocal_id\b/.test(str) || /\bcost_basis\b/.test(str)) {
    return undefined;
  }

  return str;
}

// Convert Supabase holding to local format
function fromSupabaseHolding(row: any): Holding {
  return {
    id: row.id,
    metal: row.metal,
    type: cleanType(row.type),
    weight: row.weight,
    weightUnit: row.weight_unit || 'oz',
    quantity: row.quantity,
    purchasePrice: row.purchase_price,
    purchaseDate: row.purchase_date,
    notes: cleanNotes(row.notes),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchSupabaseHoldings(userId: string): Promise<Holding[]> {
  const { data, error } = await supabase
    .from('holdings')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching holdings:', error);
    throw error;
  }

  return (data || []).map(fromSupabaseHolding);
}

export async function addSupabaseHolding(
  formData: HoldingFormData,
  userId: string
): Promise<Holding> {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  // Convert weight to troy oz for storage
  const weightInOz = formData.weight * WEIGHT_CONVERSIONS[formData.weightUnit];

  const holding: Holding = {
    id,
    metal: formData.metal,
    type: formData.type,
    weight: weightInOz,
    weightUnit: formData.weightUnit,
    quantity: formData.quantity,
    purchasePrice: formData.purchasePrice,
    purchaseDate: formData.purchaseDate,
    notes: formData.notes,
    createdAt: now,
    updatedAt: now,
  };

  const { error } = await supabase
    .from('holdings')
    .insert(toSupabaseHolding(holding, userId));

  if (error) {
    console.error('Error adding holding:', error);
    throw error;
  }

  return holding;
}

export async function updateSupabaseHolding(
  id: string,
  formData: HoldingFormData,
  userId: string
): Promise<Holding> {
  const now = new Date().toISOString();

  // Convert weight to troy oz for storage
  const weightInOz = formData.weight * WEIGHT_CONVERSIONS[formData.weightUnit];

  const updates = {
    metal: formData.metal,
    type: formData.type,
    weight: weightInOz,
    weight_unit: formData.weightUnit,
    quantity: formData.quantity,
    purchase_price: formData.purchasePrice,
    purchase_date: formData.purchaseDate,
    notes: formData.notes || null,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from('holdings')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating holding:', error);
    throw error;
  }

  return fromSupabaseHolding(data);
}

export async function deleteSupabaseHolding(
  id: string,
  userId: string
): Promise<void> {
  // Soft delete by setting deleted_at
  const { error } = await supabase
    .from('holdings')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting holding:', error);
    throw error;
  }
}

// Sync local holdings to Supabase (for initial migration)
// Generates new UUIDs since local IDs are not valid UUIDs
export async function syncLocalToSupabase(
  localHoldings: Holding[],
  userId: string
): Promise<void> {
  if (localHoldings.length === 0) return;

  // Convert local holdings to Supabase format with new UUIDs
  const supabaseHoldings = localHoldings.map((h) => ({
    id: crypto.randomUUID(), // Generate new UUID for Supabase
    user_id: userId,
    metal: h.metal,
    type: h.type,
    weight: h.weight,
    weight_unit: h.weightUnit,
    quantity: h.quantity,
    purchase_price: h.purchasePrice,
    purchase_date: h.purchaseDate,
    notes: h.notes || null,
    created_at: h.createdAt,
    updated_at: h.updatedAt,
  }));

  const { error } = await supabase
    .from('holdings')
    .insert(supabaseHoldings);

  if (error) {
    console.error('Error syncing holdings:', error);
    throw error;
  }
}
