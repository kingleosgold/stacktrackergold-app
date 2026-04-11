export const cardClass =
  'rounded-xl px-4 py-3 mt-2 text-sm bg-white/5 border border-white/10 text-text';

export function fmtUSD(n: number | undefined | null, opts: Intl.NumberFormatOptions = {}): string {
  if (n == null || Number.isNaN(n)) return '—';
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
    ...opts,
  });
}

export function fmtPct(n: number | undefined | null, digits = 2): string {
  if (n == null || Number.isNaN(n)) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(digits)}%`;
}

export function fmtNum(n: number | undefined | null, digits = 2): string {
  if (n == null || Number.isNaN(n)) return '—';
  return n.toLocaleString('en-US', { maximumFractionDigits: digits });
}

export function gainColor(n: number | undefined | null): string {
  if (n == null) return 'text-text-muted';
  return n >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]';
}

export function asNumber(v: unknown): number | undefined {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

export function asString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}
