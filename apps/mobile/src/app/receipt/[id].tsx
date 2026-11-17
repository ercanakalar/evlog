import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';
import { Badge, Button, Card, ErrorView, Field, IconButton, Loading, Row, Screen, SectionHeader, T } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { money, RECEIPT_KIND_LABEL } from '@/lib/format';
import { useConfirmReceipt, useReceipt, useUpdateReceipt } from '@/lib/queries';
import type { Receipt } from '@/lib/types';
import { useTheme } from '@/theme/use-theme';

/** Review what the receipt reader found, fix mistakes, then confirm. */
export default function ReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const receipt = useReceipt(id);
  if (receipt.isPending) return <Loading />;
  if (receipt.isError) return <ErrorView error={receipt.error} onRetry={() => void receipt.refetch()} />;
  // Remount the form when the reader finishes so fields start from its result.
  return <ReceiptForm key={`${receipt.data.id}:${receipt.data.status}`} receipt={receipt.data} />;
}

function ReceiptForm({ receipt: r }: { receipt: Receipt }) {
  const { colors } = useTheme();
  const update = useUpdateReceipt(r.id);
  const confirm = useConfirmReceipt(r.id);
  const [merchant, setMerchant] = useState(r.merchantName ?? '');
  const [date, setDate] = useState(r.issuedAt?.slice(0, 10) ?? '');
  const [total, setTotal] = useState(r.totalAmount ?? '');

  const editable = r.status === 'PARSED' || r.status === 'FAILED';
  const dateValid = /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date));
  const totalValid = /^\d+([.,]\d{1,2})?$/.test(total.trim());

  const save = async () => {
    await update.mutateAsync({
      merchantName: merchant.trim() || undefined,
      issuedAt: dateValid ? new Date(`${date}T12:00:00`).toISOString() : undefined,
      totalAmount: totalValid ? Number(total.replace(',', '.')) : undefined,
    });
  };

  const saveAndConfirm = async () => {
    try {
      await save();
      await confirm.mutateAsync();
      router.back();
    } catch (error) {
      Alert.alert('Could not confirm', error instanceof ApiError ? error.messages.join('\n') : undefined);
    }
  };

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between', marginTop: 8 }}>
        <T variant="title">{RECEIPT_KIND_LABEL[r.kind]}</T>
        <IconButton icon="x" tone="card" label="Close" onPress={() => router.back()} />
      </Row>
      <Badge
        label={
          { PENDING: 'Waiting', PROCESSING: 'Reading…', PARSED: 'Check the details', FAILED: 'Could not read', CONFIRMED: 'Confirmed' }[r.status]
        }
        tone={r.status === 'CONFIRMED' ? 'success' : r.status === 'FAILED' ? 'danger' : 'neutral'}
      />
      {r.status === 'PROCESSING' || r.status === 'PENDING' ? <Loading /> : null}
      {r.ocrError ? (
        <T color={colors.dangerText}>{r.ocrError}. You can fill in the details yourself.</T>
      ) : null}

      {editable ? (
        <Card>
          <Field label="Store / issuer" value={merchant} onChangeText={setMerchant} maxLength={200} />
          <Field
            label="Date (YYYY-MM-DD)"
            value={date}
            onChangeText={setDate}
            keyboardType="numbers-and-punctuation"
            error={date && !dateValid ? 'Use YYYY-MM-DD' : undefined}
          />
          <Field
            label={`Total (${r.currency})`}
            value={total}
            onChangeText={setTotal}
            keyboardType="decimal-pad"
            error={total && !totalValid ? 'Enter an amount like 842,50' : undefined}
          />
        </Card>
      ) : r.status === 'CONFIRMED' ? (
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <T muted>Store</T>
            <T>{r.merchantName ?? '—'}</T>
          </Row>
          <Row style={{ justifyContent: 'space-between' }}>
            <T muted>Date</T>
            <T>{r.issuedAt?.slice(0, 10) ?? '—'}</T>
          </Row>
          <Row style={{ justifyContent: 'space-between' }}>
            <T muted>Total</T>
            <T variant="label">{money(r.totalAmount, r.currency)}</T>
          </Row>
        </Card>
      ) : null}

      {r.items && r.items.length > 0 ? (
        <>
          <SectionHeader title={`Items (${r.items.length})`} />
          <Card>
            {r.items.map((item) => (
              <Row key={item.id} style={{ justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <T numberOfLines={1}>{item.name}</T>
                  <T variant="caption" muted>
                    {Number(item.quantity)} {item.unit ?? 'pcs'}
                  </T>
                </View>
                <T variant="label">{money(item.totalPrice, r.currency)}</T>
              </Row>
            ))}
          </Card>
        </>
      ) : null}

      {editable ? (
        <Button
          title="Looks right — confirm"
          icon="check"
          disabled={!dateValid || !totalValid}
          loading={update.isPending || confirm.isPending}
          onPress={() => void saveAndConfirm()}
        />
      ) : null}
    </Screen>
  );
}
