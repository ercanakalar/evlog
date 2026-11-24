import { useTranslation } from 'react-i18next';
import { ReceiptItems } from '@/components/receipts/ReceiptItems';
import { ReceiptStatusBadge } from '@/components/receipts/ReceiptStatusBadge';
import { Button, Card, ErrorView, FormField, IconButton, Loading, Screen, ScreenHeader, SpaceBetween, Text } from '@/components/ui';
import { useFormatters } from '@/hooks/common/useFormatters';
import { useReceipt, useReceiptForm } from '@/hooks/receipts/useReceiptReview';
import { useTheme } from '@/theme';
import type { Receipt } from '@/types/api/models';
import type { RootScreenProps } from '@/types/screens/navigation';

/** Review what the receipt reader found, fix mistakes, then confirm. */
export function ReceiptReviewScreen({ route, navigation }: RootScreenProps<'ReceiptReview'>) {
  const { t } = useTranslation();
  const receipt = useReceipt(route.params.receiptId);

  if (receipt.isLoading) return <Loading />;
  if (!receipt.data) return <ErrorView error={receipt.error} onRetry={receipt.refetch} />;
  const r = receipt.data;

  return (
    <Screen>
      <ScreenHeader
        title={t(`receipts.kind.${r.kind}`)}
        action={<IconButton icon="x" tone="card" label={t('common.close')} onPress={() => navigation.goBack()} />}
      />
      <ReceiptStatusBadge status={r.status} />
      {r.status === 'PENDING' || r.status === 'PROCESSING' ? <Loading /> : null}
      {/* Remount when the reader finishes so the form starts from its result. */}
      <ReceiptBody key={`${r.id}:${r.status}`} receipt={r} />
      <ReceiptItems items={r.items ?? []} currency={r.currency} />
    </Screen>
  );
}

function ReceiptBody({ receipt }: { receipt: Receipt }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const f = useFormatters();
  const form = useReceiptForm(receipt);

  if (receipt.status === 'CONFIRMED') {
    return (
      <Card>
        <SpaceBetween>
          <Text muted>{t('receipts.merchant')}</Text>
          <Text>{receipt.merchantName ?? '—'}</Text>
        </SpaceBetween>
        <SpaceBetween>
          <Text muted>{t('receipts.date')}</Text>
          <Text>{f.shortDate(receipt.issuedAt)}</Text>
        </SpaceBetween>
        <SpaceBetween>
          <Text muted>{t('receipts.total', { currency: receipt.currency })}</Text>
          <Text variant="label">{f.money(receipt.totalAmount, receipt.currency)}</Text>
        </SpaceBetween>
      </Card>
    );
  }
  if (!form.editable) return null;

  return (
    <>
      {receipt.ocrError ? <Text color={colors.dangerText}>{t('receipts.readerError', { error: receipt.ocrError })}</Text> : null}
      <Card>
        <FormField control={form.control} name="merchantName" label={t('receipts.merchant')} maxLength={200} />
        <FormField
          control={form.control}
          name="issuedOn"
          label={t('receipts.date')}
          keyboardType="numbers-and-punctuation"
        />
        <FormField
          control={form.control}
          name="total"
          label={t('receipts.total', { currency: receipt.currency })}
          keyboardType="decimal-pad"
        />
      </Card>
      <Button
        title={t('receipts.confirm')}
        icon="check"
        disabled={!form.isValid}
        loading={form.isSubmitting}
        onPress={() => void form.submit()}
      />
    </>
  );
}
