export default function SpotPrices() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <div className="p-4 rounded-lg bg-surface border border-border">
        <p className="text-sm text-text-muted">Gold</p>
        <p className="text-xl font-semibold text-gold">$--</p>
      </div>
      <div className="p-4 rounded-lg bg-surface border border-border">
        <p className="text-sm text-text-muted">Silver</p>
        <p className="text-xl font-semibold">$--</p>
      </div>
      <div className="p-4 rounded-lg bg-surface border border-border">
        <p className="text-sm text-text-muted">Platinum</p>
        <p className="text-xl font-semibold">$--</p>
      </div>
      <div className="p-4 rounded-lg bg-surface border border-border">
        <p className="text-sm text-text-muted">Palladium</p>
        <p className="text-xl font-semibold">$--</p>
      </div>
    </div>
  );
}
