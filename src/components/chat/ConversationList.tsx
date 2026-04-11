import type { TroyConversationSummary } from '../../services/troy';

interface Props {
  conversations: TroyConversationSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  loading?: boolean;
}

function groupByBucket(conversations: TroyConversationSummary[]): [string, TroyConversationSummary[]][] {
  const now = Date.now();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfThisWeek = new Date(startOfToday);
  startOfThisWeek.setDate(startOfThisWeek.getDate() - 7);

  const buckets: Record<string, TroyConversationSummary[]> = {
    Today: [],
    Yesterday: [],
    'This Week': [],
    Earlier: [],
  };

  const sorted = [...conversations].sort((a, b) => {
    const ta = new Date(a.updated_at ?? a.created_at).getTime();
    const tb = new Date(b.updated_at ?? b.created_at).getTime();
    return tb - ta;
  });

  for (const c of sorted) {
    const t = new Date(c.updated_at ?? c.created_at).getTime();
    if (t >= startOfToday.getTime()) buckets.Today.push(c);
    else if (t >= startOfYesterday.getTime()) buckets.Yesterday.push(c);
    else if (t >= startOfThisWeek.getTime()) buckets['This Week'].push(c);
    else buckets.Earlier.push(c);
  }

  void now;
  return Object.entries(buckets).filter(([, v]) => v.length > 0);
}

export function ConversationList({ conversations, activeId, onSelect, onDelete, loading }: Props) {
  if (loading) {
    return <div className="px-3 py-2 text-xs text-text-muted">Loading conversations…</div>;
  }
  if (conversations.length === 0) {
    return <div className="px-3 py-2 text-xs text-text-muted">No conversations yet.</div>;
  }
  const groups = groupByBucket(conversations);

  return (
    <div className="space-y-3">
      {groups.map(([bucket, items]) => (
        <div key={bucket}>
          <div className="px-3 text-[10px] uppercase tracking-wider text-text-muted mb-1">{bucket}</div>
          <ul className="space-y-0.5">
            {items.map((c) => {
              const isActive = c.id === activeId;
              return (
                <li key={c.id}>
                  <div
                    className={`group flex items-center gap-1 rounded-lg transition-colors ${
                      isActive ? 'bg-white/[0.07]' : 'hover:bg-white/[0.04]'
                    }`}
                  >
                    <button
                      onClick={() => onSelect(c.id)}
                      className={`flex-1 text-left px-3 py-2 text-xs truncate ${
                        isActive ? 'text-[#DAA520]' : 'text-text-secondary'
                      }`}
                      title={c.title}
                    >
                      {c.title || 'Untitled'}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(c.id); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 mr-1 text-text-muted hover:text-[#EF4444]"
                      aria-label="Delete conversation"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
