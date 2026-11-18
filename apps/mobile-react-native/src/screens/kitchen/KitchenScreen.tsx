import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { PriceWatchCard } from '@/components/kitchen/PriceWatchCard';
import { RunningLowItem } from '@/components/kitchen/RunningLowItem';
import { ScanReceiptCard } from '@/components/kitchen/ScanReceiptCard';
import { Button, Card, Empty, ErrorView, Loading, Screen, ScreenHeader, SectionHeader, SpaceBetween, Text } from '@/components/ui';
import { useFormatters } from '@/hooks/common/useFormatters';
import { useKitchen } from '@/hooks/kitchen/useKitchen';

export function KitchenScreen() {
  const { t } = useTranslation();
  const f = useFormatters();
  const k = useKitchen();

  if (k.isLoading) return <Loading />;
  if (!k.kitchen) return <ErrorView error={k.error} onRetry={k.refresh} />;
  const { lastScan, runningLow, priceWatch } = k.kitchen;

  return (
    <Screen withTabBar refreshing={k.isRefreshing} onRefresh={k.refresh}>
      <ScreenHeader title={t('kitchen.title')} />
      <ScanReceiptCard onScan={k.scanGroceries} scanning={k.scanning} />
      {lastScan ? (
        <SpaceBetween style={{ paddingHorizontal: 4 }}>
          <Text variant="caption" muted>
            {t('kitchen.lastScan', { date: f.shortDate(lastScan.issuedAt), count: lastScan.itemCount })}
          </Text>
          <Text variant="caption" style={{ fontWeight: '700' }}>
            {f.money(lastScan.total, lastScan.currency)}
          </Text>
        </SpaceBetween>
      ) : null}

      <SectionHeader title={t('kitchen.runningLow')} />
      <Card style={{ padding: 6, gap: 6 }}>
        {runningLow.length === 0 ? <Empty text={t('kitchen.nothingLow')} /> : null}
        {runningLow.map((item) => (
          <RunningLowItem key={item.id} item={item} onAdd={() => void k.addToShoppingList(item.name)} />
        ))}
      </Card>

      <SectionHeader
        title={t('kitchen.priceWatch')}
        action={
          <Text variant="caption" muted>
            {t('kitchen.vsLast')}
          </Text>
        }
      />
      {priceWatch.length === 0 ? <Empty text={t('kitchen.noPrices')} /> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {priceWatch.map((p) => (
          <PriceWatchCard key={p.normalizedName} price={p} />
        ))}
      </View>
      {lastScan ? (
        <Button title={t('kitchen.reviewLast')} variant="ghost" onPress={() => k.openReceipt(lastScan.receiptId)} />
      ) : null}
    </Screen>
  );
}
