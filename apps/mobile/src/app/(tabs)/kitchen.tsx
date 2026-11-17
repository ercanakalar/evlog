import { router } from 'expo-router';
import { Alert, View } from 'react-native';
import { useReceiptScanner } from '@/components/scan-receipt-button';
import { Badge, Button, Card, Empty, ErrorView, IconButton, Loading, Row, Screen, SectionHeader, T } from '@/components/ui';
import { ago, money, shortDate } from '@/lib/format';
import { useCurrentHome } from '@/lib/home-context';
import { useAddToShoppingList, useKitchen } from '@/lib/queries';
import { useTheme } from '@/theme/use-theme';

export default function KitchenScreen() {
  const { home } = useCurrentHome();
  const { colors } = useTheme();
  const kitchen = useKitchen(home.id);
  const addToList = useAddToShoppingList(home.id);
  const scanner = useReceiptScanner(home.id);

  if (kitchen.isPending) return <Loading />;
  if (kitchen.isError) return <ErrorView error={kitchen.error} onRetry={() => void kitchen.refetch()} />;
  const { lastScan, runningLow, priceWatch } = kitchen.data;

  return (
    <Screen refreshing={kitchen.isRefetching} onRefresh={() => void kitchen.refetch()}>
      <T variant="title" style={{ marginTop: 12 }}>
        Kitchen
      </T>

      <Card tone="primary" onPress={() => scanner.start('GROCERY')}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <T variant="heading" color={colors.onPrimary} style={{ fontSize: 20 }}>
              Scan a receipt
            </T>
            <T variant="caption" color={colors.onPrimary}>
              {scanner.scanning ? 'Reading your receipt…' : 'Items and prices are added for you'}
            </T>
          </View>
          <IconButton icon="maximize" tone="light" size={44} label="Scan a receipt" onPress={() => scanner.start('GROCERY')} />
        </Row>
      </Card>
      {lastScan ? (
        <Row style={{ justifyContent: 'space-between', paddingHorizontal: 4 }}>
          <T variant="caption" muted>
            Last scan · {shortDate(lastScan.issuedAt)} · {lastScan.itemCount} items
          </T>
          <T variant="caption" style={{ fontWeight: '700' }}>
            {money(lastScan.total, lastScan.currency)}
          </T>
        </Row>
      ) : null}

      <SectionHeader title="Running low" />
      <Card style={{ padding: 6, gap: 6 }}>
        {runningLow.length === 0 ? <Empty text="Nothing running low." /> : null}
        {runningLow.map((item) => (
          <Card key={item.id} tone="muted" style={{ padding: 12 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <T variant="label">{item.name}</T>
                <T variant="caption" muted>
                  Bought {ago(item.lastPurchasedAt)}
                  {item.usualDurationDays ? ` · usually lasts ${item.usualDurationDays} days` : ''}
                </T>
              </View>
              <IconButton
                icon="plus"
                label={`Add ${item.name} to shopping list`}
                onPress={() =>
                  addToList.mutate(item.name, {
                    onSuccess: () => Alert.alert('Added', `${item.name} is on your shopping list.`),
                  })
                }
              />
            </Row>
          </Card>
        ))}
      </Card>

      <SectionHeader
        title="Price watch"
        action={
          <T variant="caption" muted>
            vs. your last receipt
          </T>
        }
      />
      {priceWatch.length === 0 ? <Empty text="Scan two receipts to compare prices." /> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {priceWatch.map((p) => (
          <Card key={p.normalizedName} style={{ width: '48%' }}>
            <T variant="caption" muted numberOfLines={1}>
              {p.name}
              {p.unit ? ` · per ${p.unit}` : ''}
            </T>
            <T variant="heading">{money(p.price)}</T>
            {p.changePercent === null ? (
              <Badge label="new" />
            ) : (
              <Badge
                label={`${p.changePercent > 0 ? '+' : p.changePercent < 0 ? '−' : ''}${Math.abs(p.changePercent)}%`}
                tone={p.changePercent > 0 ? 'danger' : p.changePercent < 0 ? 'success' : 'neutral'}
              />
            )}
          </Card>
        ))}
      </View>
      {lastScan ? (
        <Button
          title="Review last receipt"
          variant="ghost"
          onPress={() => router.push({ pathname: '/receipt/[id]', params: { id: lastScan.receiptId } })}
        />
      ) : null}
    </Screen>
  );
}
