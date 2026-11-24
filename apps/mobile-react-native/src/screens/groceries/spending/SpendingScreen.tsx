import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { BreakdownRow } from '@/components/groceries/spending/BreakdownRow';
import { MonthBars } from '@/components/groceries/spending/MonthBars';
import { Card, Empty, ErrorView, Loading, Screen, ScreenHeader, Segmented, Text } from '@/components/ui';
import { useFormatters } from '@/hooks/groceries/common/useFormatters';
import { useSpending, type Breakdown } from '@/hooks/groceries/spending/useSpending';
import type { RootScreenProps } from '@/types/screens/navigation';

export function SpendingScreen({ route }: RootScreenProps<'GrocerySpending'>) {
  const { t } = useTranslation('groceries');
  const f = useFormatters();
  const s = useSpending(route.params?.month);

  if (s.isLoading) return <Loading />;
  if (!s.data) return <ErrorView error={s.error} onRetry={s.refetch} />;
  const { data } = s;
  const rows =
    s.view === 'categories'
      ? data.byCategory.map((r) => ({ name: f.category(r.category), total: Number(r.total) }))
      : data.byMarket.map((r) => ({ name: r.market ?? t('trips.unknownMarket'), total: Number(r.total) }));
  const top = rows[0]?.total || 1;

  return (
    <Screen header={<ScreenHeader back title={t('spending.title')} />} gap={16}>
      <Card style={{ paddingTop: 16, paddingBottom: 8, gap: 12 }}>
        <View style={{ gap: 3 }}>
          <Text variant="smallMedium" muted>
            {s.isCurrent ? t('spending.soFar', { month: f.month(s.month) }) : f.month(s.month)}
          </Text>
          <Text variant="amountL">{f.money(data.total, s.currency)}</Text>
        </View>
        <MonthBars months={data.months} selected={s.month} peak={s.peak} currency={s.currency} onSelect={s.setMonth} />
      </Card>

      <Segmented<Breakdown>
        value={s.view}
        onChange={s.setView}
        options={[
          { value: 'categories', label: t('spending.byCategory') },
          { value: 'markets', label: t('spending.byMarket') },
        ]}
      />

      <View style={{ gap: 14, opacity: s.isFetching ? 0.6 : 1 }}>
        {rows.length === 0 ? <Empty text={t('spending.empty')} /> : null}
        {rows.map((r) => (
          <BreakdownRow key={r.name} name={r.name} value={f.money(r.total, s.currency)} share={r.total / top} />
        ))}
      </View>
    </Screen>
  );
}
