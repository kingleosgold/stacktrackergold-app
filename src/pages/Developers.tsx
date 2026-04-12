import { useState } from 'react';
import { Link } from 'react-router-dom';

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

interface CopyableCodeBlockProps {
  label?: string;
  code: string;
}

function CopyableCodeBlock({ label, code }: CopyableCodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy:', code);
    }
  };

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{ background: '#0B1120', borderColor: 'rgba(201,168,76,0.1)' }}
    >
      <div
        className="flex items-center justify-between px-4 py-2 border-b"
        style={{ borderColor: 'rgba(201,168,76,0.1)' }}
      >
        <span className="text-[10px] uppercase tracking-wider text-[#94A3B8]">{label ?? 'Code'}</span>
        <button
          onClick={handleCopy}
          className="text-[11px] font-semibold transition-colors hover:text-white"
          style={{ color: copied ? '#C9A84C' : '#94A3B8' }}
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <pre className="px-4 py-3 font-mono text-[12px] leading-relaxed overflow-x-auto text-[#E5E7EB]">
        {code}
      </pre>
    </div>
  );
}

const CLAUDE_DESKTOP_CONFIG = `{
  "mcpServers": {
    "troystack": {
      "url": "https://api.troystack.ai/mcp"
    }
  }
}`;

const CURSOR_CONFIG = `{
  "troystack": {
    "url": "https://api.troystack.ai/mcp"
  }
}`;

const MCP_TOOLS: Array<{ name: string; description: string }> = [
  { name: 'get_spot_prices', description: 'Live gold, silver, platinum, palladium prices' },
  { name: 'get_price_history', description: 'Historical price data with configurable range' },
  { name: 'get_stack_signal', description: 'AI-generated market intelligence articles' },
  { name: 'get_vault_watch', description: 'COMEX warehouse inventory data' },
  { name: 'get_junk_silver', description: 'Pre-1965 US coin silver melt calculator' },
  { name: 'get_speculation', description: 'What-if price scenario calculator' },
];

interface Endpoint {
  method: Method;
  path: string;
  description: string;
}

const PUBLIC_ENDPOINTS: Endpoint[] = [
  { method: 'GET', path: '/v1/prices', description: 'Live spot prices (Au, Ag, Pt, Pd) with daily change' },
  { method: 'GET', path: '/v1/prices/history', description: 'Historical price data. Params: metal, range (1M–ALL)' },
  { method: 'GET', path: '/v1/historical-spot', description: 'Single-date spot lookup with 5-tier fallback' },
  { method: 'POST', path: '/v1/historical-spot-batch', description: 'Batch date lookup (max 100)' },
  { method: 'GET', path: '/v1/stack-signal', description: 'Stack Signal articles. Params: limit, offset, category' },
  { method: 'GET', path: '/v1/stack-signal/latest', description: 'Latest synthesis article' },
  { method: 'GET', path: '/v1/stack-signal/:slug', description: 'Article by slug' },
  { method: 'GET', path: '/v1/vault-watch', description: 'COMEX warehouse inventory' },
  { method: 'GET', path: '/v1/vault-watch/history', description: 'Historical vault data. Params: metal, days' },
  { method: 'GET', path: '/v1/junk-silver', description: 'Junk silver melt calculator. Params: dimes, quarters, half_dollars, kennedy_40, dollars, war_nickels' },
  { method: 'GET', path: '/v1/speculation', description: 'What-if price scenarios. Params: silver, gold, platinum, palladium' },
  { method: 'GET', path: '/v1/market-intel', description: 'Market intelligence articles' },
];

const AUTH_ENDPOINTS: Endpoint[] = [
  { method: 'GET', path: '/v1/portfolio', description: 'Portfolio summary with live valuation' },
  { method: 'GET', path: '/v1/analytics', description: 'Cost basis and allocation analysis' },
  { method: 'GET', path: '/v1/holdings', description: 'List user holdings' },
];

const SAMPLE_RESPONSE = `{
  "success": true,
  "timestamp": "2026-04-11T14:32:15Z",
  "source": "metals.dev",
  "marketsClosed": false,
  "prices": {
    "gold":      { "price": 3421.50, "change_pct":  0.42 },
    "silver":    { "price":   48.21, "change_pct":  1.15 },
    "platinum":  { "price":  1087.30, "change_pct": -0.28 },
    "palladium": { "price":   989.75, "change_pct":  0.07 }
  }
}`;

function MethodBadge({ method }: { method: Method }) {
  const gold = method === 'GET';
  return (
    <span
      className="inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider"
      style={
        gold
          ? { border: '1px solid #C9A84C', color: '#C9A84C', background: 'transparent' }
          : { border: '1px solid rgba(148,163,184,0.4)', color: '#94A3B8', background: 'transparent' }
      }
    >
      {method}
    </span>
  );
}

function EndpointTable({ title, endpoints, authBadge }: { title: string; endpoints: Endpoint[]; authBadge?: string }) {
  return (
    <section className="mb-10">
      <div className="flex items-center gap-3 mb-3">
        <h2 className="text-xs uppercase tracking-wider text-[#94A3B8]">{title}</h2>
        {authBadge && (
          <span
            className="text-[10px] font-mono px-2 py-0.5 rounded"
            style={{ background: 'rgba(201,168,76,0.12)', color: '#C9A84C' }}
          >
            {authBadge}
          </span>
        )}
      </div>
      <div
        className="rounded-xl border overflow-hidden"
        style={{ background: '#141B2D', borderColor: 'rgba(201,168,76,0.1)' }}
      >
        <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
          {endpoints.map((e) => (
            <div
              key={`${e.method}-${e.path}`}
              className="grid grid-cols-[auto_minmax(0,1fr)] sm:grid-cols-[auto_minmax(220px,1fr)_2fr] gap-3 px-5 py-3.5 items-start"
              style={{ borderColor: 'rgba(255,255,255,0.04)' }}
            >
              <div className="pt-0.5">
                <MethodBadge method={e.method} />
              </div>
              <code className="font-mono text-[13px] text-white break-all">{e.path}</code>
              <p className="col-span-2 sm:col-span-1 text-[12px] text-[#94A3B8] leading-relaxed sm:pl-2">
                {e.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Developers() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      {/* Header */}
      <header className="mb-10">
        <div
          className="inline-block px-2.5 py-0.5 text-[10px] uppercase tracking-wider rounded mb-3"
          style={{ background: 'rgba(201,168,76,0.12)', color: '#C9A84C' }}
        >
          Developers
        </div>
        <h1 className="text-3xl font-semibold text-white mb-3">TroyStack API</h1>
        <p className="text-sm text-[#94A3B8] leading-relaxed max-w-2xl">
          Precious metals data for developers. Live prices, historical data, market intelligence,
          and portfolio management.
        </p>
      </header>

      {/* Connect via MCP */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-white mb-2">Connect via MCP</h2>
        <p className="text-sm text-[#94A3B8] leading-relaxed max-w-2xl mb-5">
          TroyStack is available as an MCP server. Connect from Claude Desktop, Cursor, or any
          MCP-compatible client to access live precious metals data directly in your AI tools.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Claude Desktop */}
          <div
            className="rounded-xl border p-5"
            style={{ background: '#141B2D', borderColor: 'rgba(201,168,76,0.1)' }}
          >
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-6 h-6 rounded flex items-center justify-center"
                style={{ background: 'rgba(201,168,76,0.15)', color: '#C9A84C' }}
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-white">Claude Desktop</h3>
            </div>
            <p className="text-[12px] text-[#94A3B8] mb-3">
              Add to your <code className="font-mono text-white px-1 rounded" style={{ background: 'rgba(255,255,255,0.06)' }}>claude_desktop_config.json</code>:
            </p>
            <CopyableCodeBlock label="JSON" code={CLAUDE_DESKTOP_CONFIG} />
          </div>

          {/* Cursor */}
          <div
            className="rounded-xl border p-5"
            style={{ background: '#141B2D', borderColor: 'rgba(201,168,76,0.1)' }}
          >
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-6 h-6 rounded flex items-center justify-center"
                style={{ background: 'rgba(201,168,76,0.15)', color: '#C9A84C' }}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-white">Cursor</h3>
            </div>
            <p className="text-[12px] text-[#94A3B8] mb-3">
              Add to your MCP settings:
            </p>
            <CopyableCodeBlock label="JSON" code={CURSOR_CONFIG} />
          </div>
        </div>

        {/* Available tools */}
        <div
          className="rounded-xl border p-5 mb-4"
          style={{ background: '#141B2D', borderColor: 'rgba(201,168,76,0.1)' }}
        >
          <h3 className="text-xs uppercase tracking-wider text-[#94A3B8] mb-3">Available tools</h3>
          <ul className="space-y-2">
            {MCP_TOOLS.map((t) => (
              <li key={t.name} className="flex items-baseline gap-3 flex-wrap">
                <code
                  className="font-mono text-[12px] font-semibold"
                  style={{ color: '#C9A84C' }}
                >
                  {t.name}
                </code>
                <span className="text-[12px] text-[#94A3B8]">— {t.description}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-[12px] text-[#94A3B8]">
          No authentication required for public tools. MCP endpoint:{' '}
          <code
            className="font-mono text-[12px] px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(255,255,255,0.06)', color: '#C9A84C' }}
          >
            https://api.troystack.ai/mcp
          </code>
        </p>
      </section>

      {/* Base URL */}
      <section className="mb-10">
        <h2 className="text-xs uppercase tracking-wider text-[#94A3B8] mb-3">Base URL</h2>
        <div
          className="rounded-lg border px-4 py-3"
          style={{ background: '#141B2D', borderColor: 'rgba(201,168,76,0.1)' }}
        >
          <code className="font-mono text-sm" style={{ color: '#C9A84C' }}>
            https://api.troystack.ai
          </code>
        </div>
      </section>

      {/* Authentication */}
      <section className="mb-10">
        <h2 className="text-xs uppercase tracking-wider text-[#94A3B8] mb-3">Authentication</h2>
        <p className="text-sm text-[#94A3B8] leading-relaxed mb-3">
          Public endpoints require no authentication. Authenticated endpoints use a{' '}
          <span className="text-white font-medium">Bearer token</span> in the{' '}
          <code className="font-mono text-[12px] px-1.5 py-0.5 rounded text-white" style={{ background: 'rgba(255,255,255,0.08)' }}>
            Authorization
          </code>{' '}
          header.
        </p>
        <div
          className="rounded-lg border px-4 py-3"
          style={{ background: '#141B2D', borderColor: 'rgba(201,168,76,0.1)' }}
        >
          <code className="font-mono text-[13px] text-[#E5E7EB] break-all">
            Authorization: Bearer YOUR_API_KEY
          </code>
        </div>
      </section>

      {/* Endpoints */}
      <EndpointTable title="Public endpoints" endpoints={PUBLIC_ENDPOINTS} authBadge="No auth" />
      <EndpointTable title="Authenticated endpoints" endpoints={AUTH_ENDPOINTS} authBadge="Bearer token" />

      {/* Example */}
      <section className="mb-10">
        <h2 className="text-xs uppercase tracking-wider text-[#94A3B8] mb-3">Example</h2>
        <div
          className="rounded-lg border overflow-hidden"
          style={{ background: '#0B1120', borderColor: 'rgba(201,168,76,0.1)' }}
        >
          <div
            className="px-4 py-2 text-[10px] uppercase tracking-wider text-[#94A3B8] border-b"
            style={{ borderColor: 'rgba(201,168,76,0.1)' }}
          >
            Request
          </div>
          <pre className="px-4 py-3 font-mono text-[13px] overflow-x-auto" style={{ color: '#C9A84C' }}>
            {`curl https://api.troystack.ai/v1/prices`}
          </pre>
        </div>
        <div
          className="rounded-lg border overflow-hidden mt-3"
          style={{ background: '#0B1120', borderColor: 'rgba(201,168,76,0.1)' }}
        >
          <div
            className="px-4 py-2 text-[10px] uppercase tracking-wider text-[#94A3B8] border-b"
            style={{ borderColor: 'rgba(201,168,76,0.1)' }}
          >
            Response
          </div>
          <pre className="px-4 py-3 font-mono text-[12px] leading-relaxed overflow-x-auto text-[#E5E7EB]">
            {SAMPLE_RESPONSE}
          </pre>
        </div>
      </section>

      {/* Rate limits */}
      <section className="mb-10">
        <h2 className="text-xs uppercase tracking-wider text-[#94A3B8] mb-3">Rate limits</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { tier: 'Free', rate: '100', unit: 'requests / hour' },
            { tier: 'Pro', rate: '1,000', unit: 'requests / hour' },
            { tier: 'Enterprise', rate: '10,000', unit: 'requests / hour' },
          ].map((t) => (
            <div
              key={t.tier}
              className="rounded-lg border px-4 py-3"
              style={{ background: '#141B2D', borderColor: 'rgba(201,168,76,0.1)' }}
            >
              <div className="text-[10px] uppercase tracking-wider text-[#94A3B8]">{t.tier}</div>
              <div className="mt-1 text-lg font-semibold" style={{ color: '#C9A84C' }}>
                {t.rate}
              </div>
              <div className="text-[11px] text-[#94A3B8]">{t.unit}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[12px] text-[#94A3B8]">
          Contact{' '}
          <a
            href="mailto:support@troystack.com"
            className="hover:underline"
            style={{ color: '#C9A84C' }}
          >
            support@troystack.com
          </a>{' '}
          for Pro / Enterprise access.
        </p>
      </section>

      {/* CTA */}
      <section
        className="rounded-xl p-6 text-center border"
        style={{ background: '#141B2D', borderColor: 'rgba(201,168,76,0.1)' }}
      >
        <h3 className="text-base font-semibold text-white mb-1">Need an API key?</h3>
        <p className="text-sm text-[#94A3B8] mb-4">Generate one below.</p>
        <Link
          to="/developers/keys"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-[#0B1120] hover:opacity-90 transition-opacity"
          style={{ background: '#C9A84C' }}
        >
          Go to API Keys
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
          </svg>
        </Link>
      </section>
    </div>
  );
}
