import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Card, SpaceBetween, Text } from '@/components/ui';
import { useFormatters } from '@/hooks/common/useFormatters';
import type { Receipt } from '@/types/api/models';
import { ReceiptStatusBadge } from './ReceiptStatusBadge';

export function ReceiptRow({ receipt, onPress }: { receipt: Receipt; onPress: () => void }) {
  const { t } = useTranslation();
  const f = useFormatters();
  return (
    <Card onPress={onPress} accessibilityLabel={t(`receipts.kind.${receipt.kind}`)}>
      <SpaceBetween>
        <View style={{ flex: 1 }}>
          <Text variant="label">{receipt.merchantName ?? t(`receipts.kind.${receipt.kind}`)}</Text>
          <Text variant="caption" muted>
            {t(`receipts.kind.${receipt.kind}`)} · {f.shortDate(receipt.issuedAt ?? receipt.createdAt)}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text variant="label">{f.money(receipt.totalAmount, receipt.currency)}</Text>
          <ReceiptStatusBadge status={receipt.status} />
        </View>
      </SpaceBetween>
    </Card>
  );
}
