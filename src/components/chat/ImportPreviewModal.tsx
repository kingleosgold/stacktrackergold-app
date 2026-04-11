import type { Metal } from '../../types/holding';

export interface ParsedRow {
  description?: string;
  metal?: Metal;
  type?: string;
  weight?: number;
  quantity?: number;
  purchasePrice?: number;
  purchaseDate?: string;
  raw?: Record<string, unknown>;
}

interface Props {
  title: string;
  rows: ParsedRow[];
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  error?: string | null;
}

export function ImportPreviewModal({ title, rows, onConfirm, onCancel, loading, error }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onCancel} />
      <div className="relative w-full max-w-2xl max-h-[85vh] rounded-xl bg-[#141419] border border-white/10 shadow-2xl flex flex-col">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-text">{title}</h3>
            <p className="text-xs text-text-muted mt-0.5">{rows.length} {rows.length === 1 ? 'row' : 'rows'} detected — review before importing.</p>
          </div>
          <button onClick={onCancel} className="text-text-muted hover:text-text">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-auto flex-1">
          {rows.length === 0 ? (
            <div className="p-8 text-center text-sm text-text-muted">No rows parsed. Check the file format.</div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[#141419] text-text-muted uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Description</th>
                  <th className="text-left px-4 py-2 font-medium">Metal</th>
                  <th className="text-right px-4 py-2 font-medium">Weight (oz)</th>
                  <th className="text-right px-4 py-2 font-medium">Qty</th>
                  <th className="text-right px-4 py-2 font-medium">Price</th>
                  <th className="text-left px-4 py-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t border-white/5">
                    <td className="px-4 py-2 text-text">{r.description ?? '—'}</td>
                    <td className="px-4 py-2 text-text-secondary capitalize">{r.metal ?? '—'}</td>
                    <td className="px-4 py-2 text-right text-text-secondary">{r.weight ?? '—'}</td>
                    <td className="px-4 py-2 text-right text-text-secondary">{r.quantity ?? '—'}</td>
                    <td className="px-4 py-2 text-right text-text-secondary">{r.purchasePrice != null ? `$${r.purchasePrice.toFixed(2)}` : '—'}</td>
                    <td className="px-4 py-2 text-text-secondary">{r.purchaseDate ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {error && (
          <div className="px-5 py-2 border-t border-white/10 text-xs text-[#EF4444]">{error}</div>
        )}

        <div className="px-5 py-4 border-t border-white/10 flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading || rows.length === 0}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-[#DAA520] text-[#1a1508] hover:bg-[#E8B42E] disabled:opacity-40"
          >
            {loading ? 'Importing…' : `Import ${rows.length} ${rows.length === 1 ? 'row' : 'rows'}`}
          </button>
        </div>
      </div>
    </div>
  );
}
