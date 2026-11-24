import { useTranslation } from 'react-i18next';
import { ReceiptRow } from '@/components/receipts/ReceiptRow';
import { Button, Empty, ErrorView, Loading, Screen, ScreenHeader } from '@/components/ui';
import { useReceiptList } from '@/hooks/receipts/useReceiptList';
import type { RootScreenProps } from '@/types/screens/navigation';

export function ReceiptListScreen({ navigation }: RootScreenProps<'ReceiptList'>) {
  const { t } = useTranslation();
  const r = useReceiptList();

  if (r.isLoading) return <Loading />;
  if (r.error && r.receipts.length === 0) return <ErrorView error={r.error} onRetry={r.refresh} />;

  return (
    <Screen refreshing={r.isRefreshing} onRefresh={r.refresh}>
      <ScreenHeader back title={t('receipts.title')} />
      {r.receipts.length === 0 ? <Empty text={t('receipts.empty')} /> : null}
      {r.receipts.map((receipt) => (
        <ReceiptRow
          key={receipt.id}
          receipt={receipt}
          onPress={() => navigation.navigate('ReceiptReview', { receiptId: receipt.id })}
        />
      ))}
      {r.hasMore ? <Button title={t('receipts.loadMore')} variant="ghost" loading={r.loadingMore} onPress={r.loadMore} /> : null}
    </Screen>
  );
}
