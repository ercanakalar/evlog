import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { TripRow } from '@/components/trips/TripRow';
import { Button, ChipRow, Empty, ErrorView, Loading, ReceiptPaper, Screen, ScreenHeader, Text } from '@/components/ui';
import { useFormatters } from '@/hooks/common/useFormatters';
import { useTrips } from '@/hooks/trips/useTrips';

const ALL = '__all__';

export function TripsScreen() {
  const { t } = useTranslation();
  const f = useFormatters();
  const trips = useTrips();

  return (
    <Screen refreshing={trips.isRefreshing} onRefresh={trips.refresh} gap={14}>
      <ScreenHeader title={t('trips.title')} />

      <View style={{ gap: 3 }}>
        <Text variant="smallMedium" muted style={{ fontSize: 13.5 }}>
          {`${f.month(trips.thisMonth.month)} · ${t('home.trips', { count: trips.thisMonth.trips })}`}
        </Text>
        <Text variant="amountL">{f.money(trips.thisMonth.total)}</Text>
      </View>

      {trips.markets.length > 1 ? (
        <ChipRow
          label={t('trips.filter')}
          value={trips.market ?? ALL}
          onChange={(v) => trips.setMarket(v === ALL ? null : v)}
          options={[{ value: ALL, label: t('common.all') }, ...trips.markets.map((m) => ({ value: m.name, label: m.name }))]}
        />
      ) : null}

      {trips.isLoading ? <Loading /> : null}
      {!trips.isLoading && trips.error ? <ErrorView error={trips.error} onRetry={trips.refresh} /> : null}
      {!trips.isLoading && !trips.error && trips.months.length === 0 ? <Empty text={t('trips.empty')} /> : null}

      {trips.months.map((group, index) => (
        <View key={group.month || 'undated'} style={{ gap: 8 }}>
          {index > 0 || group.month !== trips.thisMonth.month ? (
            <Text variant="subheading" accessibilityRole="header">
              {group.month ? `${f.month(group.month)} · ${f.money(group.total)}` : t('trips.undated')}
            </Text>
          ) : null}
          <ReceiptPaper style={{ paddingVertical: 4, paddingHorizontal: 14, gap: 0 }}>
            {group.trips.map((trip, i) => (
              <TripRow key={trip.id} trip={trip} last={i === group.trips.length - 1} onPress={() => trips.openTrip(trip.id)} />
            ))}
          </ReceiptPaper>
        </View>
      ))}

      {trips.hasMore ? (
        <Button title={t('trips.more')} variant="ghost" loading={trips.loadingMore} onPress={trips.loadMore} />
      ) : null}
    </Screen>
  );
}
