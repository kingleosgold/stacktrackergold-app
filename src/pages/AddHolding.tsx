import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHoldings } from '../hooks/useHoldings';
import { useSpotPrices } from '../hooks/useSpotPrices';
import type { Metal, WeightUnit, HoldingFormData } from '../types/holding';
import { PRODUCT_TYPES } from '../types/holding';

const METALS: Metal[] = ['gold', 'silver', 'platinum', 'palladium'];
const WEIGHT_UNITS: { value: WeightUnit; label: string }[] = [
  { value: 'oz', label: 'Troy Oz' },
  { value: 'g', label: 'Grams' },
  { value: 'kg', label: 'Kilograms' },
];

export default function AddHolding() {
  const navigate = useNavigate();
  const { addHolding } = useHoldings();
  const { prices } = useSpotPrices();

  const [metal, setMetal] = useState<Metal>('gold');
  const [type, setType] = useState('');
  const [customType, setCustomType] = useState('');
  const [weight, setWeight] = useState('1');
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('oz');
  const [quantity, setQuantity] = useState('1');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const productTypes = PRODUCT_TYPES[metal];
  const selectedType = type === 'Other' ? customType : type;

  // Calculate estimated value based on spot price
  const getEstimatedValue = (): number => {
    if (!prices) return 0;
    const spotPrice = prices[metal] || 0;
    const weightNum = parseFloat(weight) || 0;
    const qtyNum = parseInt(quantity, 10) || 0;

    // Convert weight to troy oz for calculation
    let weightInOz = weightNum;
    if (weightUnit === 'g') weightInOz = weightNum * 0.0321507;
    if (weightUnit === 'kg') weightInOz = weightNum * 32.1507;

    return weightInOz * qtyNum * spotPrice;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!selectedType.trim()) {
      setError('Please select or enter a product type');
      return;
    }

    const weightNum = parseFloat(weight);
    if (isNaN(weightNum) || weightNum <= 0) {
      setError('Please enter a valid weight');
      return;
    }

    const qtyNum = parseInt(quantity, 10);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      setError('Please enter a valid quantity');
      return;
    }

    const priceNum = parseFloat(purchasePrice);
    if (isNaN(priceNum) || priceNum < 0) {
      setError('Please enter a valid purchase price');
      return;
    }

    const formData: HoldingFormData = {
      metal,
      type: selectedType.trim(),
      weight: weightNum,
      weightUnit,
      quantity: qtyNum,
      purchasePrice: priceNum,
      purchaseDate,
      notes: notes.trim() || undefined,
    };

    try {
      addHolding(formData);
      navigate('/holdings');
    } catch (err) {
      setError('Failed to save holding. Please try again.');
    }
  };

  const estimatedValue = getEstimatedValue();

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Add Holding</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Metal Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Metal</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {METALS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMetal(m);
                  setType('');
                  setCustomType('');
                }}
                className={`py-3 px-4 rounded-lg border transition-colors capitalize ${
                  metal === m
                    ? 'bg-gold text-background border-gold font-medium'
                    : 'bg-surface border-border hover:bg-surface-hover'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Product Type */}
        <div>
          <label className="block text-sm font-medium mb-2">Product Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full p-3 rounded-lg bg-surface border border-border focus:border-gold focus:outline-none"
          >
            <option value="">Select a type...</option>
            {productTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          {type === 'Other' && (
            <input
              type="text"
              value={customType}
              onChange={(e) => setCustomType(e.target.value)}
              placeholder="Enter custom type..."
              className="w-full mt-2 p-3 rounded-lg bg-surface border border-border focus:border-gold focus:outline-none"
            />
          )}
        </div>

        {/* Weight and Unit */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Weight</label>
            <input
              type="number"
              step="any"
              min="0"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full p-3 rounded-lg bg-surface border border-border focus:border-gold focus:outline-none"
              placeholder="1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Unit</label>
            <select
              value={weightUnit}
              onChange={(e) => setWeightUnit(e.target.value as WeightUnit)}
              className="w-full p-3 rounded-lg bg-surface border border-border focus:border-gold focus:outline-none"
            >
              {WEIGHT_UNITS.map((u) => (
                <option key={u.value} value={u.value}>{u.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-sm font-medium mb-2">Quantity</label>
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full p-3 rounded-lg bg-surface border border-border focus:border-gold focus:outline-none"
            placeholder="1"
          />
        </div>

        {/* Purchase Price */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Total Purchase Price (USD)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              className="w-full p-3 pl-7 rounded-lg bg-surface border border-border focus:border-gold focus:outline-none"
              placeholder="0.00"
            />
          </div>
          {estimatedValue > 0 && (
            <p className="text-sm text-text-muted mt-1">
              Current spot value: ${estimatedValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          )}
        </div>

        {/* Purchase Date */}
        <div>
          <label className="block text-sm font-medium mb-2">Purchase Date</label>
          <input
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="w-full p-3 rounded-lg bg-surface border border-border focus:border-gold focus:outline-none"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium mb-2">Notes (Optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full p-3 rounded-lg bg-surface border border-border focus:border-gold focus:outline-none resize-none"
            placeholder="Dealer, condition, serial number, etc."
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-sm">
            {error}
          </div>
        )}

        {/* Submit Button */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 py-3 px-4 rounded-lg bg-surface border border-border hover:bg-surface-hover transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 py-3 px-4 rounded-lg bg-gold text-background font-medium hover:bg-gold-hover transition-colors"
          >
            Add Holding
          </button>
        </div>
      </form>
    </div>
  );
}
