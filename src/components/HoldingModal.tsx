import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSpotPrices } from '../hooks/useSpotPrices';
import type { Metal, WeightUnit, HoldingFormData, Holding } from '../types/holding';
import { PRODUCT_TYPES, WEIGHT_CONVERSIONS } from '../types/holding';

const METALS: Metal[] = ['gold', 'silver', 'platinum', 'palladium'];
const WEIGHT_UNITS: { value: WeightUnit; label: string }[] = [
  { value: 'oz', label: 'Troy Oz' },
  { value: 'g', label: 'Grams' },
  { value: 'kg', label: 'Kilograms' },
];

const METAL_ACCENT: Record<Metal, string> = {
  gold: '#D4A843',
  silver: '#C0C0C0',
  platinum: '#7BB3D4',
  palladium: '#6BBF8A',
};

interface HoldingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: HoldingFormData) => void;
  onDelete?: () => void;
  initialData?: Holding;
  title: string;
}

export default function HoldingModal({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  initialData,
  title,
}: HoldingModalProps) {
  const { prices } = useSpotPrices();

  const getDisplayWeight = (): string => {
    if (!initialData) return '1';
    const storedOz = initialData.weight;
    const unit = initialData.weightUnit;
    return (storedOz / WEIGHT_CONVERSIONS[unit]).toString();
  };

  const [metal, setMetal] = useState<Metal>(initialData?.metal || 'gold');
  const [type, setType] = useState(initialData?.type || '');
  const [customType, setCustomType] = useState('');
  const [weight, setWeight] = useState(getDisplayWeight);
  const [weightUnit, setWeightUnit] = useState<WeightUnit>(initialData?.weightUnit || 'oz');
  const [quantity, setQuantity] = useState(initialData?.quantity?.toString() || '1');
  const [purchasePrice, setPurchasePrice] = useState(initialData?.purchasePrice?.toString() || '');
  const [purchaseDate, setPurchaseDate] = useState(
    initialData?.purchaseDate || new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (initialData?.type) {
      const presets = PRODUCT_TYPES[initialData.metal];
      if (presets.includes(initialData.type)) {
        setType(initialData.type);
      } else {
        setType('Other');
        setCustomType(initialData.type);
      }
    }
  }, [initialData]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const productTypes = PRODUCT_TYPES[metal];
  const selectedType = type === 'Other' ? customType : type;

  const getEstimatedValue = (): number => {
    if (!prices) return 0;
    const spotPrice = prices[metal] || 0;
    const weightNum = parseFloat(weight) || 0;
    const qtyNum = parseInt(quantity, 10) || 0;
    let weightInOz = weightNum;
    if (weightUnit === 'g') weightInOz = weightNum * 0.0321507;
    if (weightUnit === 'kg') weightInOz = weightNum * 32.1507;
    return weightInOz * qtyNum * spotPrice;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

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

    onSubmit({
      metal,
      type: selectedType.trim(),
      weight: weightNum,
      weightUnit,
      quantity: qtyNum,
      purchasePrice: priceNum,
      purchaseDate,
      notes: notes.trim() || undefined,
    });

    if (!initialData) {
      setMetal('gold');
      setType('');
      setCustomType('');
      setWeight('1');
      setWeightUnit('oz');
      setQuantity('1');
      setPurchasePrice('');
      setPurchaseDate(new Date().toISOString().split('T')[0]);
      setNotes('');
    }
  };

  const estimatedValue = getEstimatedValue();
  const inputClass = "w-full px-3 py-2.5 rounded-lg bg-background border border-border focus:border-gold/50 focus:outline-none text-sm text-text placeholder-text-muted transition-colors";
  const labelClass = "block text-xs font-medium text-text-secondary mb-1.5";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Slide-out Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-sidebar border-l border-border z-50 overflow-y-auto"
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">{title}</h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg bg-surface hover:bg-surface-hover flex items-center justify-center transition-colors"
                >
                  <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Metal Selection */}
                <div>
                  <label className={labelClass}>Metal</label>
                  <div className="grid grid-cols-4 gap-2">
                    {METALS.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setMetal(m);
                          setType('');
                          setCustomType('');
                        }}
                        className="relative py-2.5 px-2 rounded-lg border text-xs font-medium capitalize transition-all"
                        style={metal === m ? {
                          borderColor: METAL_ACCENT[m],
                          backgroundColor: `${METAL_ACCENT[m]}15`,
                          color: METAL_ACCENT[m],
                        } : {
                          borderColor: 'var(--color-border)',
                          backgroundColor: 'var(--color-surface)',
                          color: 'var(--color-text-muted)',
                        }}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Product Type */}
                <div>
                  <label className={labelClass}>Product Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className={inputClass}
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
                      className={`${inputClass} mt-2`}
                    />
                  )}
                </div>

                {/* Weight + Unit */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Weight</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      className={inputClass}
                      placeholder="1"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Unit</label>
                    <select
                      value={weightUnit}
                      onChange={(e) => setWeightUnit(e.target.value as WeightUnit)}
                      className={inputClass}
                    >
                      {WEIGHT_UNITS.map((u) => (
                        <option key={u.value} value={u.value}>{u.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Quantity */}
                <div>
                  <label className={labelClass}>Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className={inputClass}
                    placeholder="1"
                  />
                </div>

                {/* Purchase Price */}
                <div>
                  <label className={labelClass}>Purchase Price Per Item (USD)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(e.target.value)}
                      className={`${inputClass} pl-7`}
                      placeholder="0.00"
                    />
                  </div>
                  {estimatedValue > 0 && (
                    <p className="text-xs text-text-muted mt-1.5">
                      Current spot value: {estimatedValue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                    </p>
                  )}
                </div>

                {/* Purchase Date */}
                <div>
                  <label className={labelClass}>Purchase Date</label>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className={inputClass}
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className={labelClass}>Notes (Optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className={`${inputClass} resize-none`}
                    placeholder="Dealer, condition, serial number..."
                  />
                </div>

                {/* Error */}
                {error && (
                  <div className="p-3 rounded-lg bg-red/10 border border-red/20 text-red text-xs">
                    {error}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-2.5 px-4 rounded-lg bg-surface border border-border hover:bg-surface-hover text-sm transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 px-4 rounded-lg bg-gold text-background font-medium text-sm hover:bg-gold-hover transition-colors"
                  >
                    {initialData ? 'Save Changes' : 'Add Holding'}
                  </button>
                </div>

                {/* Delete */}
                {onDelete && (
                  <div className="pt-3 border-t border-border">
                    {!showDeleteConfirm ? (
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="w-full py-2.5 px-4 rounded-lg text-red border border-red/20 hover:bg-red/10 text-sm transition-colors"
                      >
                        Delete Holding
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs text-text-muted text-center">Are you sure? This cannot be undone.</p>
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => setShowDeleteConfirm(false)}
                            className="flex-1 py-2 px-3 rounded-lg bg-surface border border-border text-sm"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={onDelete}
                            className="flex-1 py-2 px-3 rounded-lg bg-red text-text font-medium text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
