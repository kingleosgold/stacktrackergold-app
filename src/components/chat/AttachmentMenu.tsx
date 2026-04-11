import { useEffect, useRef, useState } from 'react';

interface Props {
  onPhoto: (file: File) => void;
  onSpreadsheet: (file: File) => void;
  disabled?: boolean;
}

export function AttachmentMenu({ onPhoto, onSpreadsheet, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const sheetInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className="w-9 h-9 flex items-center justify-center rounded-full text-text-muted hover:text-[#DAA520] hover:bg-white/5 transition-colors disabled:opacity-40"
        aria-label="Attach file"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-56 rounded-xl bg-[#141419] border border-white/10 shadow-xl overflow-hidden z-20">
          <button
            type="button"
            onClick={() => { setOpen(false); photoInputRef.current?.click(); }}
            className="w-full flex items-center gap-3 px-3.5 py-3 text-sm text-text hover:bg-white/5 transition-colors"
          >
            <svg className="w-4 h-4 text-[#DAA520]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
            </svg>
            Upload Photo (receipt)
          </button>
          <button
            type="button"
            onClick={() => { setOpen(false); sheetInputRef.current?.click(); }}
            className="w-full flex items-center gap-3 px-3.5 py-3 text-sm text-text hover:bg-white/5 transition-colors border-t border-white/5"
          >
            <svg className="w-4 h-4 text-[#DAA520]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            Upload Spreadsheet (CSV/Excel)
          </button>
        </div>
      )}

      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPhoto(f);
          e.target.value = '';
        }}
      />
      <input
        ref={sheetInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onSpreadsheet(f);
          e.target.value = '';
        }}
      />
    </div>
  );
}
