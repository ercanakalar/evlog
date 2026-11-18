import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Card, SectionHeader, SpaceBetween, Text } from '@/components/ui';
import { useFormatters } from '@/hooks/common/useFormatters';
import type { ReceiptItem } from '@/types/api/models';

export function ReceiptItems({ items, currency }: { items: ReceiptItem[]; currency: string }) {
  const { t } = useTranslation();
  const f = useFormatters();
  if (items.length === 0) return null;
  return (
    <>
      <SectionHeader title={t('receipts.items', { count: items.length })} />
      <Card>
        {items.map((item) => (
          <SpaceBetween key={item.id}>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1}>{item.name}</Text>
              <Text variant="caption" muted>
                {Number(item.quantity)} {item.unit ?? t('receipts.pcs')}
              </Text>
            </View>
            <Text variant="label">{f.money(item.totalPrice, currency)}</Text>
          </SpaceBetween>
        ))}
      </Card>
    </>
  );
}
