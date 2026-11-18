import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Card, IconButton, SpaceBetween, Text } from '@/components/ui';
import { useFormatters } from '@/hooks/common/useFormatters';
import type { KitchenSummary } from '@/types/api/models';

type Item = KitchenSummary['runningLow'][number];

export function RunningLowItem({ item, onAdd }: { item: Item; onAdd: () => void }) {
  const { t } = useTranslation();
  const f = useFormatters();
  const bought = t('kitchen.bought', { ago: f.ago(item.lastPurchasedAt) });
  return (
    <Card tone="muted" style={{ padding: 12 }}>
      <SpaceBetween>
        <View style={{ flex: 1 }}>
          <Text variant="label">{item.name}</Text>
          <Text variant="caption" muted>
            {item.usualDurationDays
              ? `${bought} · ${t('kitchen.usuallyLasts', { count: item.usualDurationDays })}`
              : bought}
          </Text>
        </View>
        <IconButton icon="plus" label={t('kitchen.addToList', { name: item.name })} onPress={onAdd} />
      </SpaceBetween>
    </Card>
  );
}
