import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { Rule, Text } from '@/components/ui';
import { useFormatters } from '@/hooks/common/useFormatters';
import { toLocale } from '@/utils/format';
import type { Receipt } from '@/types/api/models';

/** "16 MON | Migros · 18:42 · 8 items | ₺1,064.50" */
export function TripRow({ trip, last, onPress }: { trip: Receipt; last: boolean; onPress: () => void }) {
  const { t, i18n } = useTranslation();
  const f = useFormatters();
  const date = trip.issuedAt ? new Date(trip.issuedAt) : null;
  const market = trip.merchantName ?? t('trips.unknownMarket');
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${market}, ${f.day(trip.issuedAt)}, ${f.money(trip.totalAmount, trip.currency)}`}
        onPress={onPress}
        style={({ pressed }) => ({
          minHeight: 72,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          opacity: pressed ? 0.7 : 1,
        })}>
        <View style={{ width: 42, alignItems: 'center' }}>
          <Text variant="amount" style={{ fontSize: 22, lineHeight: 24 }}>
            {date ? date.getDate() : '–'}
          </Text>
          <Text variant="monoSmall" muted style={{ fontSize: 11 }}>
            {date ? f.upper(date.toLocaleDateString(toLocale(i18n.language), { weekday: 'short' })) : ''}
          </Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="bodyStrong" style={{ fontSize: 15.5 }} numberOfLines={1}>
            {market}
          </Text>
          <Text variant="small" muted>
            {t('trips.timeItems', { time: f.time(trip.issuedAt), count: trip._count?.items ?? 0 })}
          </Text>
        </View>
        <Text variant="amount" style={{ fontSize: 14.5 }}>
          {f.money(trip.totalAmount, trip.currency)}
        </Text>
      </Pressable>
      {last ? null : <Rule />}
    </View>
  );
}
