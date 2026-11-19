import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { ReceiptPhoto } from '@/components/trips/ReceiptPhoto';
import { Button, ErrorView, Loading, ReceiptPaper, Rule, Screen, ScreenHeader, SpaceBetween, Tag, Text } from '@/components/ui';
import { HIT } from '@/constants/layout';
import { useFormatters } from '@/hooks/common/useFormatters';
import { daysUntil, useTripDetail } from '@/hooks/trips/useTripDetail';
import { fonts, useTheme } from '@/theme';
import type { RootScreenProps } from '@/types/screens/navigation';
import { countdownColors } from '@/utils/countdown';
import { lineQuantity } from '@/utils/format';

export function TripDetailScreen({ route }: RootScreenProps<'TripDetail'>) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const f = useFormatters();
  const trip = useTripDetail(route.params.receiptId);

  if (trip.isLoading) return <Loading />;
  if (!trip.receipt) return <ErrorView error={trip.error} onRetry={trip.refetch} />;
  const { receipt } = trip;
  const count = receipt.items?.length ?? 0;

  return (
    <Screen
      header={
        <ScreenHeader
          back
          action={
            <Pressable
              accessibilityRole="button"
              onPress={() => trip.setPhotoOpen(true)}
              style={{ height: HIT, paddingHorizontal: 12, justifyContent: 'center' }}>
              <Text variant="label" style={{ textDecorationLine: 'underline' }}>
                {t('trip.originalPhoto')}
              </Text>
            </Pressable>
          }
        />
      }
      gap={10}>
      <ReceiptPaper style={{ paddingTop: 18, paddingHorizontal: 16, paddingBottom: 14, gap: 0 }}>
        <Text variant="title" accessibilityRole="header" style={{ textAlign: 'center', letterSpacing: 1 }}>
          {(receipt.merchantName ?? t('trips.unknownMarket')).toLocaleUpperCase()}
        </Text>
        <SpaceBetween style={{ marginTop: 8, paddingBottom: 10 }}>
          <Text variant="mono">{f.longDate(receipt.issuedAt).toLocaleUpperCase()}</Text>
          <Text variant="mono">{f.time(receipt.issuedAt)}</Text>
        </SpaceBetween>
        <Rule strong />

        {trip.groups.map((group) => (
          <View key={group.category} style={{ paddingTop: 10 }}>
            <Text variant="monoSmall" muted style={{ fontFamily: fonts.monoBold, marginBottom: 2 }} accessibilityRole="header">
              {f.category(group.category).toLocaleUpperCase()}
            </Text>
            {group.items.map((item) => {
              const days = daysUntil(item.expiresAt);
              const tone = days === null ? colors.textMuted : countdownColors(days, colors).text;
              const left = days === null ? t('countdown.noExpiry') : days === 0 ? t('trip.useToday') : t('trip.daysLeft', { count: days });
              const times = lineQuantity(item.quantity, item.unit);
              const name = times ? `${item.name} ${times}` : item.name;
              const atHome = (item.homeChanges ?? [])
                .map((c) => t('trip.atHome', { amount: f.homeAmount(Number(c.amount), c.homeItem.unit), name: c.homeItem.name }))
                .join(' · ');
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${name}, ${left}, ${f.money(item.totalPrice, receipt.currency)}`}
                  onPress={() => trip.openProduct(item.id)}
                  style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <View style={{ flexShrink: 1 }}>
                    <Text variant="bodyStrong" style={{ fontSize: 14.5 }}>
                      {name}
                    </Text>
                    <Text variant="monoSmall" color={tone}>
                      {left.toLocaleUpperCase()}
                    </Text>
                    {atHome ? (
                      <View style={{ marginTop: 3 }}>
                        <Tag label={atHome} tone="accent" />
                      </View>
                    ) : null}
                  </View>
                  <Text variant="mono" style={{ fontSize: 14 }}>
                    {f.money(item.totalPrice, receipt.currency)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}

        <Rule strong style={{ marginTop: 10 }} />
        <SpaceBetween style={{ paddingTop: 10, alignItems: 'baseline' }}>
          <Text variant="monoBold" style={{ fontSize: 14 }}>
            {t('trip.total', { count }).toLocaleUpperCase()}
          </Text>
          <Text variant="amount" style={{ fontSize: 20, letterSpacing: -0.4 }}>
            {f.money(receipt.totalAmount, receipt.currency)}
          </Text>
        </SpaceBetween>
      </ReceiptPaper>

      {trip.packsToScan > 0 ? (
        <View style={{ gap: 4 }}>
          <Button title={t('trip.scanPacks', { count: trip.packsToScan })} variant="accent" onPress={trip.scanPacks} />
          <Text variant="small" muted style={{ textAlign: 'center' }}>
            {t('trip.scanPacksHint')}
          </Text>
        </View>
      ) : null}
      <Button title={t('trip.delete')} variant="danger" onPress={trip.remove} />
      <ReceiptPhoto receiptId={receipt.id} visible={trip.photoOpen} onClose={() => trip.setPhotoOpen(false)} />
    </Screen>
  );
}
