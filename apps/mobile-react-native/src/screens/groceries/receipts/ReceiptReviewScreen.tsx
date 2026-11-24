import Feather from '@expo/vector-icons/Feather';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { ReceiptHeaderEditor } from '@/components/groceries/receipts/ReceiptHeaderEditor';
import { ReviewLine } from '@/components/groceries/receipts/ReviewLine';
import { Button, Card, ErrorView, FooterBar, Loading, Row, Screen, ScreenHeader, SpaceBetween, Text } from '@/components/ui';
import { useFormatters } from '@/hooks/groceries/common/useFormatters';
import { useReceiptReview } from '@/hooks/groceries/receipts/useReceiptReview';
import { useTheme } from '@/theme';
import type { RootScreenProps } from '@/types/screens/navigation';

export function ReceiptReviewScreen({ route }: RootScreenProps<'GroceryReceipt'>) {
  const { t } = useTranslation('groceries');
  const { colors } = useTheme();
  const f = useFormatters();
  const r = useReceiptReview(route.params.receiptId);
  const [editingHeader, setEditingHeader] = useState(false);

  if (r.isLoading) return <Loading />;
  if (!r.receipt) return <ErrorView error={r.error} onRetry={r.refetch} />;
  const { receipt } = r;
  const items = receipt.items ?? [];
  const saved = receipt.status === 'CONFIRMED';
  const failed = receipt.status === 'FAILED';
  const editable = receipt.status === 'PARSED';

  const status = r.matchesTotal
    ? r.toCheck > 0
      ? t('review.matchToCheck', { count: items.length, check: r.toCheck })
      : t('review.match', { count: items.length })
    : t('review.noMatch', { sum: f.money(r.itemsSum, receipt.currency) });

  const selected = t('review.selected', {
    sum: f.money(r.selection.sum, receipt.currency),
    total: f.money(receipt.totalAmount ?? r.itemsSum, receipt.currency),
  });
  const counts = t('review.trackedCount', { count: r.selection.tracked, total: r.selection.total });

  const footer = editable ? (
    <FooterBar>
      <SpaceBetween style={{ gap: 8 }}>
        <Text variant="smallMedium" style={{ flexShrink: 1 }}>
          {counts}
        </Text>
        <Text variant="smallMedium" muted style={{ flexShrink: 1, textAlign: 'right' }}>
          {selected}
        </Text>
      </SpaceBetween>
      <Row style={{ gap: 7 }}>
        <Feather name={r.matchesTotal ? 'check' : 'alert-circle'} size={16} color={r.matchesTotal ? colors.text : colors.urgentText} />
        <Text variant="smallMedium" color={r.matchesTotal ? colors.text : colors.urgentText} style={{ flexShrink: 1 }}>
          {status}
        </Text>
      </Row>
      <Button
        title={t('review.save')}
        variant="accent"
        loading={r.saving}
        disabled={r.updating}
        onPress={() => void r.save()}
        trailing={<Text variant="amount" color={colors.onAccent}>{f.money(receipt.totalAmount, receipt.currency)}</Text>}
      />
    </FooterBar>
  ) : undefined;

  return (
    <Screen
      header={<ScreenHeader back title={t('review.title')} action={editable || failed ? (
        <Pressable accessibilityRole="button" onPress={r.discard} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 }}>
          <Text variant="label" color={colors.urgentText}>{t('review.discard')}</Text>
        </Pressable>
      ) : undefined} />}
      footer={footer}
      gap={12}>
      {r.waiting ? (
        <Card style={{ alignItems: 'center', paddingVertical: 32, gap: 12 }}>
          <ActivityIndicator color={colors.text} />
          <Text variant="bodyMedium">{t('scan.reading')}</Text>
        </Card>
      ) : null}

      {failed ? (
        <Card style={{ gap: 12 }}>
          <Text variant="bodyStrong">{t('review.failedTitle')}</Text>
          <Text variant="small" muted>{receipt.ocrError ?? t('common.somethingWrong')}</Text>
          <Button title={t('common.retry')} compact loading={r.rescanning} onPress={r.rescan} />
        </Card>
      ) : null}

      {!r.waiting && !failed ? (
        editingHeader ? (
          <ReceiptHeaderEditor
            receipt={receipt}
            saving={r.updating}
            onCancel={() => setEditingHeader(false)}
            onSave={(fields) => void r.updateHeader(fields).then((ok) => ok && setEditingHeader(false))}
          />
        ) : (
          <Card tone="ink" style={{ paddingVertical: 10, paddingRight: 8, paddingLeft: 14 }}>
            <SpaceBetween>
              <View style={{ gap: 2, flexShrink: 1 }}>
                <Text variant="screenTitle" color={colors.onInk} style={{ fontSize: 20 }}>
                  {receipt.merchantName ?? t('trips.unknownMarket')}
                </Text>
                <Text variant="mono" color={colors.onInkMuted}>
                  {`${f.longDate(receipt.issuedAt)} · ${f.time(receipt.issuedAt)}`.toLocaleUpperCase()}
                </Text>
              </View>
              {editable ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('review.editDetails')}
                  onPress={() => setEditingHeader(true)}
                  style={{ minWidth: 56, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                  <Text variant="label" color={colors.accent}>{t('review.edit')}</Text>
                </Pressable>
              ) : null}
            </SpaceBetween>
          </Card>
        )
      ) : null}

      {failed && items.length === 0 ? (
        <ReceiptHeaderEditor receipt={receipt} saving={r.updating} onSave={(fields) => void r.updateHeader(fields)} />
      ) : null}

      {items.map((item) => (
        <ReviewLine
          key={item.id}
          item={item}
          currency={receipt.currency}
          choice={r.choices.get(item.id)}
          editable={editable}
          onTrack={(on) => r.setTracked(item.id, on)}
          onConfirm={() => r.confirmLine(item.id)}
          onFix={(name, category, quantity) => r.fixLine(item.id, name, category, quantity)}
          onRemove={() => r.removeLine(item.id, item.name)}
        />
      ))}

      {saved ? <Text variant="small" muted>{t('review.alreadySaved')}</Text> : null}
    </Screen>
  );
}
