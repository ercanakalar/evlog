import { useTranslation } from 'react-i18next';
import { Badge, Card, Text } from '@/components/ui';
import { useFormatters } from '@/hooks/common/useFormatters';
import type { KitchenSummary } from '@/types/api/models';

type Price = KitchenSummary['priceWatch'][number];

export function PriceWatchCard({ price }: { price: Price }) {
  const { t } = useTranslation();
  const f = useFormatters();
  const change = price.changePercent;
  return (
    <Card style={{ width: '48%' }}>
      <Text variant="caption" muted numberOfLines={1}>
        {price.unit ? `${price.name} · ${t('kitchen.perUnit', { unit: price.unit })}` : price.name}
      </Text>
      <Text variant="heading">{f.money(price.price)}</Text>
      {change === null ? (
        <Badge label={t('kitchen.new')} />
      ) : (
        <Badge
          label={`${change > 0 ? '+' : change < 0 ? '−' : ''}${Math.abs(change)}%`}
          tone={change > 0 ? 'danger' : change < 0 ? 'success' : 'neutral'}
        />
      )}
    </Card>
  );
}
