import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Button, Card, FormField, Row } from '@/components/ui';
import { space } from '@/constants/layout';
import type { Receipt } from '@/types/api/groceries/models';
import { isoDate } from '@/utils/groceries/format';
import { receiptHeaderSchema, type ReceiptHeaderValues } from '@/utils/groceries/validation';

/** Market, date and total, for when the reader got them wrong (or failed). */
export function ReceiptHeaderEditor({
  receipt,
  onSave,
  onCancel,
  saving,
}: {
  receipt: Receipt;
  onSave: (fields: { merchantName: string; issuedAt: string; totalAmount: number }) => void;
  onCancel?: () => void;
  saving: boolean;
}) {
  const { t } = useTranslation('groceries');
  const issued = receipt.issuedAt ? new Date(receipt.issuedAt) : new Date();
  const form = useForm<ReceiptHeaderValues>({
    resolver: zodResolver(receiptHeaderSchema),
    defaultValues: {
      merchantName: receipt.merchantName ?? '',
      issuedOn: isoDate(issued),
      total: receipt.totalAmount ?? '',
    },
  });
  const submit = form.handleSubmit((values) => {
    const [y, m, d] = values.issuedOn.split('-').map(Number);
    // Keep the time of day the reader found; a typed date alone means noon.
    const at = new Date(y ?? 2000, (m ?? 1) - 1, d ?? 1, receipt.issuedAt ? issued.getHours() : 12, issued.getMinutes());
    onSave({
      merchantName: values.merchantName,
      issuedAt: at.toISOString(),
      totalAmount: Number(values.total.replace(',', '.')),
    });
  });
  return (
    <Card style={{ gap: space.md }}>
      <FormField control={form.control} name="merchantName" label={t('review.market')} autoCapitalize="words" />
      <FormField control={form.control} name="issuedOn" label={t('review.date')} placeholder="2026-11-18" keyboardType="numbers-and-punctuation" />
      <FormField control={form.control} name="total" label={t('review.total')} keyboardType="decimal-pad" />
      <Row>
        {onCancel ? (
          <View style={{ flex: 1 }}>
            <Button title={t('common.cancel')} variant="outline" compact onPress={onCancel} />
          </View>
        ) : null}
        <View style={{ flex: 1 }}>
          <Button title={t('common.save')} compact loading={saving} onPress={() => void submit()} />
        </View>
      </Row>
    </Card>
  );
}
