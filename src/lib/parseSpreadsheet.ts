import type { ParsedRow } from '../components/chat/ImportPreviewModal';
import type { Metal } from '../types/holding';

const METAL_ALIASES: Record<string, Metal> = {
  gold: 'gold', au: 'gold',
  silver: 'silver', ag: 'silver',
  platinum: 'platinum', pt: 'platinum',
  palladium: 'palladium', pd: 'palladium',
};

function normalizeHeader(h: string): string {
  return h.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}

function toMetal(v: unknown): Metal | undefined {
  if (typeof v !== 'string') return undefined;
  const key = v.trim().toLowerCase();
  return METAL_ALIASES[key];
}

function toNumber(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const cleaned = v.replace(/[$,\s]/g, '');
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function toDate(v: unknown): string | undefined {
  if (!v) return undefined;
  const s = String(v).trim();
  // Already ISO-ish?
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString().slice(0, 10);
}

function rowToParsed(obj: Record<string, unknown>): ParsedRow {
  const normalized: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    normalized[normalizeHeader(k)] = v;
  }
  return {
    description: typeof normalized.description === 'string' ? normalized.description
      : typeof normalized.type === 'string' ? normalized.type
      : typeof normalized.name === 'string' ? (normalized.name as string)
      : undefined,
    metal: toMetal(normalized.metal),
    type: typeof normalized.type === 'string' ? (normalized.type as string) : undefined,
    weight: toNumber(normalized.weight ?? normalized.ozt ?? normalized.oz),
    quantity: toNumber(normalized.quantity ?? normalized.qty) ?? 1,
    purchasePrice: toNumber(normalized.purchaseprice ?? normalized.price ?? normalized.unitprice ?? normalized.cost),
    purchaseDate: toDate(normalized.purchasedate ?? normalized.date),
    raw: obj,
  };
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const obj: Record<string, unknown> = {};
    headers.forEach((h, i) => { obj[h] = cells[i]; });
    return rowToParsed(obj);
  });
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      out.push(cur.trim()); cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur.trim());
  return out;
}

export async function parseSpreadsheet(file: File): Promise<ParsedRow[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv') || file.type === 'text/csv') {
    const text = await file.text();
    return parseCSV(text);
  }
  // Excel: dynamically import xlsx only when needed
  const XLSX = await import('xlsx');
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  return rows.map(rowToParsed);
}
