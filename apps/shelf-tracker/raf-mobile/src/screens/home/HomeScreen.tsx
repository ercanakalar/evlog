import Feather from '@expo/vector-icons/Feather';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { CountdownRow } from '@/components/shelf/CountdownRow';
import {
  Button,
  Card,
  ErrorView,
  Loading,
  ReceiptPaper,
  Rule,
  Screen,
  SectionHeader,
  SpaceBetween,
  Text,
  TextLink,
} from '@/components/ui';
import { HIT } from '@/constants/layout';
import { useFormatters } from '@/hooks/common/useFormatters';
import { useHome } from '@/hooks/home/useHome';
import { useTheme } from '@/theme';
import { initials } from '@/utils/format';

export function HomeScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const f = useFormatters();
  const h = useHome();

  if (h.isLoading) return <Loading />;
  if (!h.insights) return <ErrorView error={h.error} onRetry={h.refresh} />;
  const { insights } = h;
  const currency = h.me?.currency;
  const monthName = f.month(insights.month);

  return (
    <Screen refreshing={h.isRefreshing} onRefresh={h.refresh} gap={18}>
      <SpaceBetween>
        <Text variant="title" accessibilityRole="header">
          {t('common.appName')}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('settings.open')}
          onPress={h.openSettings}
          style={{
            width: HIT,
            height: HIT,
            borderRadius: HIT / 2,
            backgroundColor: colors.ink,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Text variant="label" color={colors.onInk}>
            {h.me ? initials(h.me.fullName) : ''}
          </Text>
        </Pressable>
      </SpaceBetween>

      <ReceiptPaper
        onPress={h.openSpending}
        accessibilityLabel={t('home.seeSpending', { month: monthName })}
        style={{ paddingBottom: 14 }}>
        <SpaceBetween>
          <Text variant="smallMedium" muted>
            {t('home.spentIn', { month: monthName })}
          </Text>
          <Feather name="chevron-right" size={18} color={colors.textMuted} />
        </SpaceBetween>
        <Text variant="amountXL">{f.money(insights.spent, currency)}</Text>
        <Text variant="small" muted>
          {h.difference === 0
            ? t('home.sameAsLastMonth')
            : t(h.difference > 0 ? 'home.moreThanLastMonth' : 'home.lessThanLastMonth', {
                amount: f.money(Math.abs(h.difference), currency),
              })}
        </Text>
        <Rule style={{ marginTop: 8 }} />
        <SpaceBetween style={{ paddingTop: 4 }}>
          <Text variant="mono">{t('home.trips', { count: insights.trips }).toLocaleUpperCase()}</Text>
          <Text variant="mono">{t('home.items', { count: insights.items }).toLocaleUpperCase()}</Text>
        </SpaceBetween>
      </ReceiptPaper>

      <View style={{ gap: 4 }}>
        <SectionHeader
          title={t('home.useSoon')}
          action={
            insights.useSoonCount > 0 ? (
              <TextLink label={t('home.seeAll', { count: insights.useSoonCount })} onPress={h.openShelf} />
            ) : undefined
          }
        />
        <View style={{ gap: 8 }}>
          {insights.useSoon.length === 0 ? (
            <Card>
              <Text variant="small" muted>
                {t('home.nothingToUse')}
              </Text>
            </Card>
          ) : (
            insights.useSoon.map((item) => (
              <CountdownRow key={item.id} item={item} onPress={() => h.openProduct(item.id)} />
            ))
          )}
        </View>
      </View>

      <View style={{ gap: 10 }}>
        <SectionHeader title={t('home.lastTrip')} />
        {insights.lastTrip ? (
          <Card
            onPress={() => h.openTrip(insights.lastTrip!.id)}
            accessibilityLabel={insights.lastTrip.merchantName ?? t('trips.unknownMarket')}>
            <SpaceBetween>
              <View style={{ gap: 2, flexShrink: 1 }}>
                <Text variant="bodyStrong">{insights.lastTrip.merchantName ?? t('trips.unknownMarket')}</Text>
                <Text variant="small" muted>
                  {t('trips.dayItems', { day: f.day(insights.lastTrip.issuedAt), count: insights.lastTrip.itemCount })}
                </Text>
              </View>
              <Text variant="amount">{f.money(insights.lastTrip.totalAmount, insights.lastTrip.currency)}</Text>
            </SpaceBetween>
          </Card>
        ) : (
          <Card style={{ gap: 12 }}>
            <Text variant="small" muted>
              {t('home.noTrips')}
            </Text>
            <Button title={t('scan.title')} variant="accent" compact onPress={h.scan} />
          </Card>
        )}
      </View>
    </Screen>
  );
}
