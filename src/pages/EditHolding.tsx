import { useParams, useNavigate } from 'react-router-dom';
import { useHoldings } from '../hooks/useHoldings';
import HoldingForm from '../components/HoldingForm';
import type { HoldingFormData } from '../types/holding';

export default function EditHolding() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { holdings, updateHolding, deleteHolding } = useHoldings();

  const holding = holdings.find((h) => h.id === id);

  if (!holding) {
    return (
      <div className="p-4 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Holding Not Found</h1>
        <p className="text-text-muted mb-4">
          The holding you're looking for doesn't exist or has been deleted.
        </p>
        <button
          onClick={() => navigate('/holdings')}
          className="px-4 py-2 rounded-lg bg-gold text-background font-medium hover:bg-gold-hover transition-colors"
        >
          Back to Holdings
        </button>
      </div>
    );
  }

  const handleSubmit = async (data: HoldingFormData) => {
    await updateHolding(holding.id, data);
    navigate('/holdings');
  };

  const handleDelete = async () => {
    await deleteHolding(holding.id);
    navigate('/holdings');
  };

  return (
    <HoldingForm
      initialData={holding}
      onSubmit={handleSubmit}
      onDelete={handleDelete}
      submitLabel="Save Changes"
      title="Edit Holding"
    />
  );
}
