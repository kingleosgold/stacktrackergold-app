import { useCallback, useEffect, useState } from 'react';
import { fetchStackSignal, type StackSignalArticle } from '../services/api';
import { LoadingState, ErrorState, EmptyState } from '../components/LoadState';

function formatDate(iso?: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

function firstLines(text: string, lines = 3): string {
  const trimmed = (text || '').trim();
  if (!trimmed) return '';
  const sentences = trimmed.split(/(?<=[.!?])\s+/).slice(0, lines).join(' ');
  if (sentences.length > 280) return sentences.slice(0, 277).trimEnd() + '…';
  return sentences;
}

function CategoryBadge({ category }: { category?: string }) {
  if (!category) return null;
  return (
    <span
      className="inline-block px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded"
      style={{ background: 'rgba(201,168,76,0.15)', color: '#C9A84C', letterSpacing: '0.08em' }}
    >
      {category}
    </span>
  );
}

function ArticleDetail({ article, onBack }: { article: StackSignalArticle; onBack: () => void }) {
  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 mb-6 text-xs text-[#94A3B8] hover:text-white transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Back to Stack Signal
      </button>

      {article.image_url && (
        <img
          src={article.image_url}
          alt=""
          className="w-full rounded-xl mb-6 object-cover"
          style={{ maxHeight: 400 }}
          loading="lazy"
        />
      )}

      <div className="flex items-center gap-3 mb-3 text-xs text-[#94A3B8]">
        <CategoryBadge category={article.category} />
        <span>{formatDate(article.published_at)}</span>
      </div>

      <h1 className="text-2xl font-semibold text-white mb-6 leading-tight">{article.title}</h1>

      <div className="prose prose-invert max-w-none text-[#E5E7EB] text-[15px] leading-relaxed whitespace-pre-wrap">
        {article.troy_commentary}
      </div>

      {article.sources && article.sources.length > 0 && (
        <div className="mt-10 pt-6 border-t" style={{ borderColor: 'rgba(201,168,76,0.1)' }}>
          <div className="text-[11px] uppercase tracking-wider text-[#94A3B8] mb-3">Sources</div>
          <ul className="space-y-2">
            {article.sources.map((s, i) => {
              const title = typeof s === 'string' ? s : s.title || s.url;
              const url = typeof s === 'string' ? undefined : s.url;
              if (!title) return null;
              return (
                <li key={i}>
                  {url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#C9A84C] hover:underline"
                    >
                      {title}
                    </a>
                  ) : (
                    <span className="text-xs text-[#94A3B8]">{title}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function StackSignal() {
  const [articles, setArticles] = useState<StackSignalArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<StackSignalArticle | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchStackSignal(20);
      setArticles(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (selected) {
    return <ArticleDetail article={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Stack Signal</h1>
        <p className="text-sm text-[#94A3B8] mt-1">
          Troy's take on today's precious metals headlines.
        </p>
      </header>

      {loading ? (
        <LoadingState label="Fetching Stack Signal…" />
      ) : error ? (
        <ErrorState message="Unable to load Stack Signal." onRetry={load} />
      ) : articles.length === 0 ? (
        <EmptyState message="No signal articles yet. Check back later." />
      ) : (
        <ul className="space-y-3">
          {articles.map((article) => (
            <li key={article.id}>
              <button
                onClick={() => setSelected(article)}
                className="w-full text-left rounded-xl overflow-hidden transition-colors border flex flex-col sm:flex-row"
                style={{ background: '#141B2D', borderColor: 'rgba(201,168,76,0.1)' }}
              >
                {article.image_url && (
                  <div className="sm:w-40 sm:shrink-0 sm:self-stretch">
                    <img
                      src={article.image_url}
                      alt=""
                      className="w-full h-40 sm:h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0 p-4">
                  <div className="flex items-center gap-3 mb-2 text-xs text-[#94A3B8]">
                    <CategoryBadge category={article.category} />
                    {article.published_at && <span>{formatDate(article.published_at)}</span>}
                  </div>
                  <h2 className="text-[15px] font-semibold text-white mb-2 leading-snug">
                    {article.title}
                  </h2>
                  <p className="text-sm text-[#94A3B8] leading-relaxed">
                    {firstLines(article.troy_commentary, 3)}
                  </p>
                  <div className="mt-3 text-xs font-semibold" style={{ color: '#C9A84C' }}>
                    Read more →
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
