import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Empty, ErrorView, Loading, ReceiptPaper, Row, Screen, ScreenHeader, SectionHeader, SpaceBetween, Tag, Text } from '@/components/ui';
import { useFormatters } from '@/hooks/common/useFormatters';
import { useHomeItem } from '@/hooks/shelf/useHomeItem';
import { useTheme } from '@/theme';
import type { RootScreenProps } from '@/types/screens/navigation';

/** An at-home product split by brand and pack size: "Sütaş · 1000 ml × 1, Sütaş · 250 ml × 2". */
export function HomeItemScreen({ route }: RootScreenProps<'HomeItem'>) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const f = useFormatters();
  const h = useHomeItem(route.params.homeItemId);

  if (h.isLoading) return <Loading />;
  if (!h.item) return <ErrorView error={h.error} onRetry={h.refetch} />;
  const { item } = h;

  return (
    <Screen header={<ScreenHeader back title={item.name} />} refreshing={h.isRefreshing} onRefresh={h.refetch} gap={16}>
      <ReceiptPaper style={{ paddingVertical: 16, gap: 4 }}>
        <Row style={{ alignItems: 'baseline', gap: 10 }}>
          <Text variant="amountXL">{f.homeAmount(item.count, item.unit)}</Text>
          <Text variant="heading">{t('atHome.atHome')}</Text>
        </Row>
        <Text variant="small" muted>
          {t(item.unit === 'KG' ? 'atHome.countedKg' : 'atHome.countedPieces')}
        </Text>
      </ReceiptPaper>

      <View style={{ gap: 8 }}>
        <SectionHeader title={t('atHome.byBrand')} />
        {item.variants.length === 0 ? <Empty text={t('atHome.noVariants')} /> : null}
        {item.variants.map((v) => {
          const pack = f.pack(v.packAmount, v.packUnit);
          const amount = f.homeAmount(v.count, item.unit);
          return (
            <View
              key={`${v.brand}|${v.packAmount}|${v.packUnit}|${v.name}`}
              accessible
              accessibilityLabel={[v.brand ?? t('atHome.noBrand'), v.name, pack, t('atHome.amountLabel', { amount })].filter(Boolean).join(', ')}
              style={{ backgroundColor: colors.card, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 }}>
              <SpaceBetween style={{ gap: 10 }}>
                <View style={{ flexShrink: 1, gap: 3, alignItems: 'flex-start' }}>
                  <Text variant="bodyStrong">{v.brand ?? t('atHome.noBrand')}</Text>
                  <Text variant="small" muted numberOfLines={1}>
                    {v.lastBoughtAt
                      ? `${v.name} · ${t('atHome.lastBought', { market: v.lastMarket ?? t('trips.unknownMarket'), date: f.shortDate(v.lastBoughtAt) })}`
                      : v.name}
                  </Text>
                  {pack ? <Tag label={pack} /> : null}
                </View>
                <Text variant="amount" style={{ fontSize: 17 }}>
                  {t('atHome.variantAmount', { amount })}
                </Text>
              </SpaceBetween>
            </View>
          );
        })}
        {h.changedByHand ? (
          <Text variant="small" muted>
            {t('atHome.byHand')}
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}
