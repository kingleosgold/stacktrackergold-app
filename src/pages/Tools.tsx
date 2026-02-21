import { useState, useMemo, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useSpotPrices } from '../hooks/useSpotPrices';
import { useHoldings } from '../hooks/useHoldings';
import { useSubscription } from '../hooks/useSubscription';
import { BlurredContent } from '../components/BlurredContent';
import { formatCurrency } from '../utils/format';
import { METAL_COLORS, METAL_LABELS, METALS } from '../utils/constants';
import type { Metal } from '../types/holding';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

// Junk silver coin data: silver content in troy oz per $1 face value
const JUNK_SILVER_COINS: Record<string, { label: string; ozPerDollar: number; description: string }> = {
  'pre-1965-dimes': { label: 'Pre-1965 Dimes', ozPerDollar: 0.7234, description: 'Roosevelt/Mercury 90% silver' },
  'pre-1965-quarters': { label: 'Pre-1965 Quarters', ozPerDollar: 0.7234, description: 'Washington 90% silver' },
  'pre-1965-halves': { label: 'Pre-1965 Half Dollars', ozPerDollar: 0.7234, description: 'Franklin/Walking Liberty 90% silver' },
  'kennedy-65-70': { label: 'Kennedy Half (1965-70)', ozPerDollar: 0.2893, description: '40% silver' },
  'war-nickels': { label: 'War Nickels (1942-45)', ozPerDollar: 0.1125, description: '35% silver' },
  'morgan-peace': { label: 'Morgan/Peace Dollars', ozPerDollar: 0.7734, description: '90% silver' },
};

function ToolSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <motion.div variants={item} className="rounded-xl bg-surface border border-border overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center text-gold">
          {icon}
        </div>
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="p-5">
        {children}
      </div>
    </motion.div>
  );
}

// What If Speculation Tool
function WhatIfTool({ isGold }: { isGold: boolean }) {
  const { prices } = useSpotPrices();
  const { holdings, getTotalsByMetal } = useHoldings();

  const [sliders, setSliders] = useState<Record<Metal, number>>({
    gold: 0,
    silver: 0,
    platinum: 0,
    palladium: 0,
  });

  const results = useMemo(() => {
    if (!prices) return null;
    const totals = getTotalsByMetal();

    let currentTotal = 0;
    let projectedTotal = 0;

    const details = METALS.map((metal) => {
      const currentPrice = prices[metal] || 0;
      const pctChange = sliders[metal];
      const projectedPrice = currentPrice * (1 + pctChange / 100);
      const oz = totals[metal].totalOz;
      const currentValue = oz * currentPrice;
      const projectedValue = oz * projectedPrice;

      currentTotal += currentValue;
      projectedTotal += projectedValue;

      return {
        metal,
        oz,
        currentPrice,
        projectedPrice,
        currentValue,
        projectedValue,
        delta: projectedValue - currentValue,
      };
    }).filter((d) => d.oz > 0);

    return { details, currentTotal, projectedTotal, delta: projectedTotal - currentTotal };
  }, [prices, holdings, sliders, getTotalsByMetal]);

  return (
    <div className="space-y-5">
      <p className="text-xs text-text-muted">Drag sliders to see how price changes would affect your stack.</p>
      <div className="space-y-4">
        {METALS.map((metal) => {
          const currentPrice = prices?.[metal] || 0;
          const projectedPrice = currentPrice * (1 + sliders[metal] / 100);
          return (
            <div key={metal}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium" style={{ color: METAL_COLORS[metal] }}>
                  {METAL_LABELS[metal]}
                </span>
                <span className="text-xs text-text-muted">
                  {formatCurrency(currentPrice)} → <span className="text-text">{formatCurrency(projectedPrice)}</span>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-text-muted w-10 text-right">-50%</span>
                <input
                  type="range"
                  min="-50"
                  max="100"
                  value={sliders[metal]}
                  onChange={(e) => setSliders({ ...sliders, [metal]: Number(e.target.value) })}
                  className="flex-1 h-1 appearance-none bg-border rounded-full accent-gold cursor-pointer"
                />
                <span className="text-[10px] text-text-muted w-10">+100%</span>
                <span className={`text-xs font-medium w-12 text-right ${sliders[metal] >= 0 ? 'text-green' : 'text-red'}`}>
                  {sliders[metal] > 0 ? '+' : ''}{sliders[metal]}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {results && results.details.length > 0 && (
        <BlurredContent show={isGold} upgradeText="Try Gold Free for 7 Days">
          <div className="mt-4 p-4 rounded-lg bg-background border border-border">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted">Projected Stack Value</span>
              <span className="text-lg font-bold">{formatCurrency(results.projectedTotal)}</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-text-muted">Change</span>
              <span className={`text-sm font-semibold ${results.delta >= 0 ? 'text-green' : 'text-red'}`}>
                {results.delta >= 0 ? '+' : ''}{formatCurrency(results.delta)}
              </span>
            </div>
          </div>
        </BlurredContent>
      )}
    </div>
  );
}

// Junk Silver Calculator
function JunkSilverCalculator() {
  const { prices } = useSpotPrices();
  const [coinType, setCoinType] = useState('pre-1965-quarters');
  const [faceValue, setFaceValue] = useState('10');

  const result = useMemo(() => {
    const silverPrice = prices?.silver || 0;
    const coin = JUNK_SILVER_COINS[coinType];
    const fv = parseFloat(faceValue) || 0;
    const silverOz = fv * coin.ozPerDollar;
    const meltValue = silverOz * silverPrice;
    return { silverOz, meltValue, silverPrice };
  }, [prices, coinType, faceValue]);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1.5">Coin Type</label>
        <select
          value={coinType}
          onChange={(e) => setCoinType(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg bg-background border border-border focus:border-gold/50 focus:outline-none text-sm"
        >
          {Object.entries(JUNK_SILVER_COINS).map(([key, coin]) => (
            <option key={key} value={key}>{coin.label}</option>
          ))}
        </select>
        <p className="text-[11px] text-text-muted mt-1">{JUNK_SILVER_COINS[coinType].description}</p>
      </div>
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1.5">Face Value ($)</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={faceValue}
          onChange={(e) => setFaceValue(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg bg-background border border-border focus:border-gold/50 focus:outline-none text-sm"
          placeholder="10.00"
        />
      </div>
      <div className="p-4 rounded-lg bg-background border border-border space-y-2">
        <div className="flex justify-between">
          <span className="text-xs text-text-muted">Silver Content</span>
          <span className="text-sm font-medium">{result.silverOz.toFixed(4)} oz</span>
        </div>
        <div className="flex justify-between">
          <span className="text-xs text-text-muted">Silver Spot</span>
          <span className="text-sm">{formatCurrency(result.silverPrice)}/oz</span>
        </div>
        <div className="flex justify-between pt-2 border-t border-border">
          <span className="text-xs text-text-muted font-medium">Melt Value</span>
          <span className="text-lg font-bold text-[#C0C0C0]">{formatCurrency(result.meltValue)}</span>
        </div>
      </div>
    </div>
  );
}

// Break-Even Analysis
function BreakEvenAnalysis({ isGold }: { isGold: boolean }) {
  const { prices } = useSpotPrices();
  const { holdings, getTotalsByMetal } = useHoldings();

  const analysis = useMemo(() => {
    if (!prices) return [];
    const totals = getTotalsByMetal();

    return METALS
      .map((metal) => {
        const data = totals[metal];
        if (data.totalOz === 0) return null;
        const breakEvenPrice = data.totalCost / data.totalOz;
        const currentPrice = prices[metal] || 0;
        const diff = currentPrice - breakEvenPrice;
        const diffPercent = breakEvenPrice > 0 ? (diff / breakEvenPrice) * 100 : 0;
        return { metal, breakEvenPrice, currentPrice, diff, diffPercent, totalOz: data.totalOz };
      })
      .filter(Boolean) as {
        metal: Metal;
        breakEvenPrice: number;
        currentPrice: number;
        diff: number;
        diffPercent: number;
        totalOz: number;
      }[];
  }, [prices, holdings, getTotalsByMetal]);

  if (analysis.length === 0) {
    return <p className="text-xs text-text-muted">Add holdings to see break-even analysis.</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-text-muted">The spot price each metal needs to reach for you to break even.</p>
      <BlurredContent show={isGold} upgradeText="Try Gold Free for 7 Days">
        {analysis.map((a) => {
          const aboveBreakEven = a.diff >= 0;
          return (
            <div key={a.metal} className="p-4 rounded-lg bg-background border border-border mb-3 last:mb-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold" style={{ color: METAL_COLORS[a.metal] }}>
                  {METAL_LABELS[a.metal]}
                </span>
                <span className={`text-xs font-medium ${aboveBreakEven ? 'text-green' : 'text-red'}`}>
                  {aboveBreakEven ? 'Above' : 'Below'} break-even
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <div>
                  <p className="text-text-muted text-xs">Break-Even</p>
                  <p className="font-bold">{formatCurrency(a.breakEvenPrice)}/oz</p>
                </div>
                <div className="text-right">
                  <p className="text-text-muted text-xs">Current Spot</p>
                  <p className="font-bold">{formatCurrency(a.currentPrice)}/oz</p>
                </div>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-border overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, Math.max(0, (a.currentPrice / a.breakEvenPrice) * 100))}%`,
                    backgroundColor: aboveBreakEven ? 'var(--color-green)' : 'var(--color-red)',
                  }}
                />
              </div>
            </div>
          );
        })}
      </BlurredContent>
    </div>
  );
}

// GSR Swap Calculator
function GSRSwapCalculator({ isGold }: { isGold: boolean }) {
  const { prices } = useSpotPrices();
  const [goldOz, setGoldOz] = useState('1');

  const result = useMemo(() => {
    if (!prices || !prices.gold || !prices.silver) return null;
    const ratio = prices.gold / prices.silver;
    const goldAmount = parseFloat(goldOz) || 0;
    const silverAmount = goldAmount * ratio;
    return {
      ratio,
      goldValue: goldAmount * prices.gold,
      silverOz: silverAmount,
      silverValue: silverAmount * prices.silver,
    };
  }, [prices, goldOz]);

  return (
    <div className="space-y-4">
      <p className="text-xs text-text-muted">See what you'd get swapping gold for silver (or vice versa) at the current ratio.</p>
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1.5">Gold (oz)</label>
        <input
          type="number"
          step="any"
          min="0"
          value={goldOz}
          onChange={(e) => setGoldOz(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg bg-background border border-border focus:border-gold/50 focus:outline-none text-sm"
          placeholder="1"
        />
      </div>
      {result && (
        <BlurredContent show={isGold} upgradeText="Try Gold Free for 7 Days">
          <div className="p-4 rounded-lg bg-background border border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted">Gold/Silver Ratio</span>
              <span className="text-sm font-bold">{result.ratio.toFixed(1)}:1</span>
            </div>
            <div className="flex items-center gap-3 py-3 border-t border-b border-border">
              <div className="flex-1 text-center">
                <p className="text-xs text-text-muted mb-1">Your Gold</p>
                <p className="text-lg font-bold text-[#D4A843]">{goldOz} oz</p>
                <p className="text-xs text-text-muted">{formatCurrency(result.goldValue)}</p>
              </div>
              <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
              </svg>
              <div className="flex-1 text-center">
                <p className="text-xs text-text-muted mb-1">Silver Equivalent</p>
                <p className="text-lg font-bold text-[#C0C0C0]">{result.silverOz.toFixed(1)} oz</p>
                <p className="text-xs text-text-muted">{formatCurrency(result.silverValue)}</p>
              </div>
            </div>
          </div>
        </BlurredContent>
      )}
    </div>
  );
}

// CSV Import/Export
function CSVTools() {
  const { holdings, exportCSV, importCSV } = useHoldings();
  const [dragOver, setDragOver] = useState(false);
  const [importPreview, setImportPreview] = useState<string[][] | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const csv = exportCSV();
    if (!csv) return;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stacktracker-holdings-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseCSVForPreview = (text: string) => {
    const lines = text.trim().split('\n');
    return lines.slice(0, 6).map((line) => {
      const cells = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
      return cells.map((cell) => cell.replace(/^"|"$/g, '').trim());
    });
  };

  const handleFile = useCallback((file: File) => {
    setImportError(null);
    setImportSuccess(null);

    if (!file.name.endsWith('.csv')) {
      setImportError('Please upload a CSV file');
      return;
    }

    file.text().then((text) => {
      const preview = parseCSVForPreview(text);
      setImportPreview(preview);

      // Store the text for actual import
      (window as unknown as Record<string, string>).__csvImportText = text;
    }).catch(() => {
      setImportError('Failed to read file');
    });
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const confirmImport = () => {
    const text = (window as unknown as Record<string, string>).__csvImportText;
    if (!text) return;

    try {
      const imported = importCSV(text);
      setImportSuccess(`Imported ${imported.length} holdings`);
      setImportPreview(null);
      delete (window as unknown as Record<string, string>).__csvImportText;
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed');
    }
  };

  return (
    <div className="space-y-4">
      {/* Export */}
      <div className="flex items-center justify-between p-4 rounded-lg bg-background border border-border">
        <div>
          <p className="text-sm font-medium">Export Holdings</p>
          <p className="text-xs text-text-muted">{holdings.length} holdings ready to export</p>
        </div>
        <button
          onClick={handleExport}
          disabled={holdings.length === 0}
          className="px-4 py-2 bg-gold text-background text-sm font-medium rounded-lg hover:bg-gold-hover transition-colors disabled:opacity-40"
        >
          Download CSV
        </button>
      </div>

      {/* Import Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`p-8 rounded-lg border-2 border-dashed text-center cursor-pointer transition-colors ${
          dragOver
            ? 'border-gold/50 bg-gold/5'
            : 'border-border hover:border-border-light'
        }`}
      >
        <svg className="w-8 h-8 mx-auto text-text-muted mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
        <p className="text-sm text-text-secondary">Drop CSV file here or click to browse</p>
        <p className="text-xs text-text-muted mt-1">Supports Stack Tracker Gold CSV format</p>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileInput}
        className="hidden"
      />

      {/* Import Preview */}
      {importPreview && (
        <div className="p-4 rounded-lg bg-background border border-border">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium">Preview</p>
            <p className="text-xs text-text-muted">{importPreview.length - 1} rows</p>
          </div>
          <div className="overflow-x-auto text-xs">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-b border-border">
                  {importPreview[0]?.map((header, i) => (
                    <th key={i} className="py-1.5 px-2 text-left text-text-muted font-medium">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {importPreview.slice(1).map((row, i) => (
                  <tr key={i} className="border-b border-border/50">
                    {row.map((cell, j) => (
                      <td key={j} className="py-1.5 px-2 text-text-secondary truncate max-w-[120px]">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-3 mt-3">
            <button
              onClick={() => setImportPreview(null)}
              className="flex-1 py-2 text-sm rounded-lg bg-surface border border-border hover:bg-surface-hover"
            >
              Cancel
            </button>
            <button
              onClick={confirmImport}
              className="flex-1 py-2 text-sm rounded-lg bg-gold text-background font-medium hover:bg-gold-hover"
            >
              Import
            </button>
          </div>
        </div>
      )}

      {importError && (
        <div className="p-3 rounded-lg bg-red/10 border border-red/20 text-red text-xs">{importError}</div>
      )}
      {importSuccess && (
        <div className="p-3 rounded-lg bg-green/10 border border-green/20 text-green text-xs">{importSuccess}</div>
      )}
    </div>
  );
}

export default function Tools() {
  const { isGold } = useSubscription();

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
      <h1 className="text-2xl font-bold tracking-tight mb-6">Tools</h1>

      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">

        <ToolSection
          title="What If Speculation"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
            </svg>
          }
        >
          <WhatIfTool isGold={isGold} />
        </ToolSection>

        <ToolSection
          title="Junk Silver Calculator"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        >
          <JunkSilverCalculator />
        </ToolSection>

        <ToolSection
          title="Break-Even Analysis"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
            </svg>
          }
        >
          <BreakEvenAnalysis isGold={isGold} />
        </ToolSection>

        <ToolSection
          title="Gold/Silver Ratio Swap"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
            </svg>
          }
        >
          <GSRSwapCalculator isGold={isGold} />
        </ToolSection>

        <ToolSection
          title="CSV Import / Export"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          }
        >
          <CSVTools />
        </ToolSection>

      </motion.div>
    </div>
  );
}
