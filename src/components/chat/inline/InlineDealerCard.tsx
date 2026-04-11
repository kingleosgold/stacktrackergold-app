import { cardClass, asString } from './cardStyles';

interface DealerLink {
  dealer?: string;
  url?: string;
  label?: string;
}

interface Props {
  data: Record<string, unknown>;
}

export function InlineDealerCard({ data }: Props) {
  const product = asString(data.product) ?? asString(data.label) ?? 'Bullion';
  const raw = data.dealers ?? data.dealer_links ?? data;
  let dealers: DealerLink[] = [];
  if (Array.isArray(raw)) {
    dealers = raw as DealerLink[];
  } else if (data.url) {
    dealers = [{ dealer: asString(data.dealer) ?? 'Shop', url: asString(data.url), label: asString(data.label) }];
  }

  return (
    <div className={cardClass}>
      <div className="text-xs uppercase tracking-wider text-text-muted mb-1">Compare Dealers</div>
      <div className="text-sm font-semibold text-text mb-2">{product}</div>
      <div className="space-y-1.5">
        {dealers.length === 0 && <div className="text-xs text-text-muted">No dealer links available.</div>}
        {dealers.map((d, i) => {
          const url = d.url;
          if (!url) return null;
          return (
            <a
              key={`${d.dealer}-${i}`}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors px-3 py-2"
            >
              <span className="text-sm text-text">{d.dealer ?? d.label ?? 'Shop'}</span>
              <svg className="w-4 h-4 text-[#DAA520]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
          );
        })}
      </div>
    </div>
  );
}
