import SpotPrices from '../components/SpotPrices';

export default function Dashboard() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <SpotPrices />

      <div className="mt-6 p-6 rounded-lg bg-surface border border-border">
        <h2 className="text-lg font-semibold mb-4 text-gold">Portfolio Value</h2>
        <p className="text-text-muted">Your portfolio summary will appear here.</p>
      </div>
    </div>
  );
}
