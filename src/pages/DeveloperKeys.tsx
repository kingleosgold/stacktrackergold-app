import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import {
  generateApiKey,
  listApiKeys,
  revokeApiKey,
  type ApiKey,
  type GeneratedApiKey,
} from '../services/api';

function tierRate(tier: string): { label: string; rate: string } {
  if (tier === 'lifetime' || tier === 'gold') {
    return { label: 'Gold', rate: '1,000 requests / hour' };
  }
  return { label: 'Free', rate: '100 requests / hour' };
}

function tierBadgeStyles(tier: ApiKey['tier']): { bg: string; color: string; label: string } {
  switch (tier) {
    case 'enterprise':
      return { bg: 'rgba(139, 92, 246, 0.15)', color: '#A78BFA', label: 'Enterprise' };
    case 'pro':
      return { bg: 'rgba(201,168,76,0.15)', color: '#C9A84C', label: 'Pro' };
    default:
      return { bg: 'rgba(148,163,184,0.15)', color: '#94A3B8', label: 'Free' };
  }
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatRequestCount(n: number | undefined): string {
  if (n == null || !Number.isFinite(n)) return '0';
  return n.toLocaleString('en-US');
}

function SignInRequired() {
  return (
    <div
      className="rounded-xl border px-6 py-10 text-center"
      style={{ background: '#141B2D', borderColor: 'rgba(201,168,76,0.1)' }}
    >
      <div
        className="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(201,168,76,0.12)' }}
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          style={{ color: '#C9A84C' }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"
          />
        </svg>
      </div>
      <h2 className="text-base font-semibold text-white mb-2">Sign in to manage API keys</h2>
      <p className="text-sm text-[#94A3B8] mb-5 max-w-sm mx-auto">
        API keys are tied to your TroyStack account. Sign in to generate, view,
        and revoke keys.
      </p>
      <Link
        to="/auth"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-[#0B1120] hover:opacity-90 transition-opacity"
        style={{ background: '#C9A84C' }}
      >
        Sign in
      </Link>
    </div>
  );
}

interface RevealKeyModalProps {
  generatedKey: GeneratedApiKey;
  onClose: () => void;
}

function RevealKeyModal({ generatedKey, onClose }: RevealKeyModalProps) {
  const [copied, setCopied] = useState(false);

  // Server returns both `api_key` and `key` — accept either so future shape changes don't break copy
  const rawKey =
    generatedKey.api_key ||
    (generatedKey as unknown as { key?: string }).key ||
    '';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(rawKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      window.prompt('Copy your API key:', rawKey);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.72)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md rounded-xl border shadow-2xl"
        style={{ background: '#141B2D', borderColor: 'rgba(201,168,76,0.3)' }}
      >
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(201,168,76,0.15)' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ color: '#C9A84C' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-white">Your new API key</h2>
          </div>
          <div
            className="rounded-md border p-3 mb-3"
            style={{ background: 'rgba(239, 68, 68, 0.06)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
          >
            <p className="text-[12px] font-semibold" style={{ color: '#FCA5A5' }}>
              Save this key now. You won&rsquo;t be able to see it again.
            </p>
          </div>

          <label className="block text-[11px] uppercase tracking-wider text-[#94A3B8] mb-1.5">API key</label>
          <div
            className="rounded-md border p-3 font-mono text-[12px] break-all text-white"
            style={{ background: '#0B1120', borderColor: 'rgba(201,168,76,0.18)' }}
          >
            {rawKey}
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] text-[#94A3B8]">
            <span>Tier: <span className="text-white font-semibold">{tierBadgeStyles(generatedKey.tier).label}</span></span>
            <span>Rate limit: <span className="text-white font-semibold">{generatedKey.rate_limit?.toLocaleString('en-US') ?? '—'}/hr</span></span>
          </div>
        </div>

        <div
          className="flex items-center justify-end gap-2 px-6 py-4 border-t"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}
        >
          <button
            onClick={copy}
            className="px-4 py-2 rounded-md text-sm font-semibold text-[#0B1120] transition-opacity hover:opacity-90"
            style={{ background: '#C9A84C' }}
          >
            {copied ? '✓ Copied' : 'Copy key'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm font-semibold text-[#94A3B8] hover:text-white transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

interface ConfirmRevokeProps {
  onConfirm: () => void;
  onCancel: () => void;
  busy: boolean;
}

function ConfirmRevoke({ onConfirm, onCancel, busy }: ConfirmRevokeProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.72)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        className="w-full max-w-sm rounded-xl border shadow-2xl"
        style={{ background: '#141B2D', borderColor: 'rgba(239, 68, 68, 0.3)' }}
      >
        <div className="px-6 pt-6 pb-4">
          <h2 className="text-base font-semibold text-white mb-2">Revoke API key?</h2>
          <p className="text-sm text-[#94A3B8]">
            Are you sure? This cannot be undone. Any service using this key will
            immediately stop working.
          </p>
        </div>
        <div
          className="flex items-center justify-end gap-2 px-6 py-4 border-t"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}
        >
          <button
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2 rounded-md text-sm font-semibold text-[#94A3B8] hover:text-white transition-colors disabled:opacity-50"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="px-4 py-2 rounded-md text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: '#DC2626' }}
          >
            {busy ? 'Revoking…' : 'Revoke'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DeveloperKeys() {
  const { user, session, isConfigured } = useAuth();
  const { tier } = useSubscription();
  const { label: tierLabel, rate: tierRateStr } = tierRate(tier);

  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<GeneratedApiKey | null>(null);

  const [confirmingRevokeId, setConfirmingRevokeId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const accessToken = session?.access_token ?? null;

  const refreshKeys = useCallback(async () => {
    if (!accessToken) return;
    setLoadingList(true);
    setListError(null);
    try {
      const list = await listApiKeys(accessToken);
      setKeys(list);
    } catch (e) {
      setListError(e instanceof Error ? e.message : 'Failed to load keys');
    } finally {
      setLoadingList(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (isConfigured && user && accessToken) {
      refreshKeys();
    }
  }, [isConfigured, user, accessToken, refreshKeys]);

  const handleGenerate = async () => {
    if (!accessToken) return;
    setGenerating(true);
    setGenerateError(null);
    try {
      const created = await generateApiKey(accessToken);
      setRevealed(created);
    } catch (e) {
      setGenerateError(e instanceof Error ? e.message : 'Failed to generate key');
    } finally {
      setGenerating(false);
    }
  };

  const handleCloseReveal = async () => {
    setRevealed(null);
    await refreshKeys();
  };

  const handleConfirmRevoke = async () => {
    if (!accessToken || !confirmingRevokeId) return;
    const id = confirmingRevokeId;
    setRevokingId(id);
    // Optimistic removal
    const prev = keys;
    setKeys((list) => list.filter((k) => k.id !== id));
    try {
      await revokeApiKey(accessToken, id);
      setConfirmingRevokeId(null);
    } catch (e) {
      // Roll back and surface
      setKeys(prev);
      setListError(e instanceof Error ? e.message : 'Failed to revoke key');
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <header className="mb-8">
        <div
          className="inline-block px-2.5 py-0.5 text-[10px] uppercase tracking-wider rounded mb-3"
          style={{ background: 'rgba(201,168,76,0.12)', color: '#C9A84C' }}
        >
          Developers
        </div>
        <h1 className="text-3xl font-semibold text-white mb-2">API Keys</h1>
        <p className="text-sm text-[#94A3B8]">
          Generate and manage the keys that authorize requests to the TroyStack API.
        </p>
      </header>

      {!isConfigured || !user ? (
        <SignInRequired />
      ) : (
        <div className="space-y-6">
          {/* Tier + rate-limit summary */}
          <div
            className="rounded-xl border p-5"
            style={{ background: '#141B2D', borderColor: 'rgba(201,168,76,0.1)' }}
          >
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-[#94A3B8]">Current plan</div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-lg font-semibold text-white">{tierLabel}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-[#94A3B8]">Rate limit</div>
                <div className="mt-1 text-sm font-semibold" style={{ color: '#C9A84C' }}>{tierRateStr}</div>
              </div>
            </div>
            {tierLabel === 'Free' && (
              <div
                className="mt-4 pt-4 border-t text-[12px] text-[#94A3B8]"
                style={{ borderColor: 'rgba(255,255,255,0.05)' }}
              >
                Upgrade to <span className="font-semibold text-white">Pro</span> for 1,000 req/hr —{' '}
                <a
                  href="mailto:support@troystack.com"
                  className="hover:underline"
                  style={{ color: '#C9A84C' }}
                >
                  Contact support@troystack.com
                </a>
              </div>
            )}
          </div>

          {/* Generate button */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-base font-semibold text-white">Your keys</h2>
              <p className="text-[12px] text-[#94A3B8] mt-0.5">
                Keep keys secret — treat them like passwords.
              </p>
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-[#0B1120] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: '#C9A84C' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              {generating ? 'Generating…' : 'Generate New Key'}
            </button>
          </div>

          {generateError && (
            <div
              className="rounded-lg border px-4 py-3 text-sm"
              style={{ background: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#FCA5A5' }}
            >
              {generateError}
            </div>
          )}

          {/* Keys table */}
          <div
            className="rounded-xl border overflow-hidden"
            style={{ background: '#141B2D', borderColor: 'rgba(201,168,76,0.1)' }}
          >
            {loadingList && keys.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-sm text-[#94A3B8]">Loading keys…</p>
              </div>
            ) : listError && keys.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-sm mb-2" style={{ color: '#FCA5A5' }}>{listError}</p>
                <button
                  onClick={refreshKeys}
                  className="text-[12px] hover:underline"
                  style={{ color: '#C9A84C' }}
                >
                  Try again
                </button>
              </div>
            ) : keys.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-sm text-white mb-1">No API keys yet.</p>
                <p className="text-[12px] text-[#94A3B8]">
                  Generate one to get started.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wider text-[#94A3B8]">
                      <th className="px-5 py-3 font-medium">Key</th>
                      <th className="px-5 py-3 font-medium">Tier</th>
                      <th className="px-5 py-3 font-medium">Rate limit</th>
                      <th className="px-5 py-3 font-medium">Created</th>
                      <th className="px-5 py-3 font-medium">Last used</th>
                      <th className="px-5 py-3 font-medium text-right">Requests</th>
                      <th className="px-5 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keys.map((k, i) => {
                      const tb = tierBadgeStyles(k.tier);
                      return (
                        <tr
                          key={k.id}
                          className={i > 0 ? 'border-t' : ''}
                          style={{ borderColor: 'rgba(255,255,255,0.04)' }}
                        >
                          <td className="px-5 py-3.5">
                            <div className="font-mono text-[12px] text-white">
                              …{k.key_preview}
                            </div>
                            {k.name && (
                              <div className="text-[11px] text-[#94A3B8] mt-0.5">{k.name}</div>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider"
                              style={{ background: tb.bg, color: tb.color }}
                            >
                              {tb.label}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-[#94A3B8]">
                            {k.rate_limit?.toLocaleString('en-US') ?? '—'}/hr
                          </td>
                          <td className="px-5 py-3.5 text-[#94A3B8]">{formatDate(k.created_at)}</td>
                          <td className="px-5 py-3.5 text-[#94A3B8]">{formatDate(k.last_used_at)}</td>
                          <td className="px-5 py-3.5 text-right text-[#94A3B8]">
                            {formatRequestCount(k.request_count)}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <button
                              onClick={() => setConfirmingRevokeId(k.id)}
                              disabled={revokingId === k.id}
                              className="text-[12px] font-semibold transition-colors disabled:opacity-50"
                              style={{ color: '#EF4444' }}
                            >
                              {revokingId === k.id ? 'Revoking…' : 'Revoke'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Docs link */}
          <div className="text-center">
            <Link
              to="/developers"
              className="text-[12px] text-[#94A3B8] hover:text-white transition-colors"
            >
              ← Back to API documentation
            </Link>
          </div>
        </div>
      )}

      {revealed && <RevealKeyModal generatedKey={revealed} onClose={handleCloseReveal} />}
      {confirmingRevokeId && (
        <ConfirmRevoke
          onConfirm={handleConfirmRevoke}
          onCancel={() => setConfirmingRevokeId(null)}
          busy={revokingId === confirmingRevokeId}
        />
      )}
    </div>
  );
}
