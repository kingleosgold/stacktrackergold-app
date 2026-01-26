import { useNavigate } from 'react-router-dom';
import { useHoldings } from '../hooks/useHoldings';
import HoldingForm from '../components/HoldingForm';
import type { HoldingFormData } from '../types/holding';

export default function AddHolding() {
  const navigate = useNavigate();
  const { addHolding } = useHoldings();

  const handleSubmit = (data: HoldingFormData) => {
    addHolding(data);
    navigate('/holdings');
  };

  return (
    <HoldingForm
      onSubmit={handleSubmit}
      submitLabel="Add Holding"
      title="Add Holding"
    />
  );
}
