import type { TroyPreview } from '../../../services/troy';
import { InlinePortfolioCard } from './InlinePortfolioCard';
import { InlinePriceCard } from './InlinePriceCard';
import { InlineRatioCard } from './InlineRatioCard';
import { InlinePurchasingPowerCard } from './InlinePurchasingPowerCard';
import { InlineDealerCard } from './InlineDealerCard';

interface Props {
  preview: TroyPreview;
}

export function InlineCard({ preview }: Props) {
  const data = (preview.data ?? {}) as Record<string, unknown>;
  switch (preview.type) {
    case 'portfolio':
    case 'cost_basis':
      return <InlinePortfolioCard data={data} />;
    case 'chart':
      if (preview.chartType === 'ratio') return <InlineRatioCard data={data} />;
      return <InlinePriceCard data={data} />;
    case 'purchasing_power':
      return <InlinePurchasingPowerCard data={data} />;
    case 'dealer_link':
      return <InlineDealerCard data={data} />;
    default:
      return null;
  }
}
