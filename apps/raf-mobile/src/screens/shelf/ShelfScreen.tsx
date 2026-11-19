import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { CountdownRow } from '@/components/shelf/CountdownRow';
import { HomeItemRow } from '@/components/shelf/HomeItemRow';
import { UnitToggle } from '@/components/shelf/UnitToggle';
import { Button, ChipRow, Empty, ErrorView, InlineAdd, Loading, Screen, ScreenHeader, Segmented, Text } from '@/components/ui';
import { CATEGORIES } from '@/constants/domain';
import { useFormatters } from '@/hooks/common/useFormatters';
import { useAtHome, useCountdown, type ShelfView } from '@/hooks/shelf/useShelf';
import type { Category } from '@/types/api/models';
import type { TabScreenProps } from '@/types/screens/navigation';

/** Two views of what is in the house: the countdown, and the at-home counts. */
export function ShelfScreen({ route, navigation }: TabScreenProps<'Shelf'>) {
  const { t } = useTranslation();
  const atHome = useAtHome();
  const view: ShelfView = atHome.enabled ? (route.params?.view ?? 'countdown') : 'countdown';

  const header = (
    <>
      <ScreenHeader
        title={t('shelf.title')}
        action={
          view === 'countdown' ? (
            <Button
              title={t('shelf.scanDates')}
              variant="outline"
              compact
              onPress={() => navigation.navigate('PackScan')}
              style={{ minHeight: 44, paddingHorizontal: 14, backgroundColor: 'transparent' }}
            />
          ) : undefined
        }
      />
      {atHome.enabled ? (
        <Segmented<ShelfView>
          value={view}
          onChange={(next) => navigation.setParams({ view: next })}
          options={[
            { value: 'countdown', label: t('shelf.countdown') },
            { value: 'atHome', label: t('shelf.atHome') },
          ]}
        />
      ) : null}
    </>
  );

  return view === 'countdown' ? <Countdown header={header} /> : <AtHome header={header} atHome={atHome} />;
}

function Countdown({ header }: { header: React.ReactNode }) {
  const { t } = useTranslation();
  const f = useFormatters();
  const c = useCountdown();
  const chips = CATEGORIES.filter((cat) => c.categories.includes(cat));

  return (
    <Screen
      header={
        <>
          {header}
          {chips.length > 1 ? (
            <ChipRow<Category | 'ALL'>
              label={t('shelf.filter')}
              value={c.category}
              onChange={c.setCategory}
              options={[{ value: 'ALL', label: t('common.all') }, ...chips.map((cat) => ({ value: cat, label: f.category(cat) }))]}
            />
          ) : null}
        </>
      }
      refreshing={c.isRefreshing}
      onRefresh={c.refresh}
      gap={8}>
      {c.isLoading ? <Loading /> : null}
      {!c.isLoading && c.error ? <ErrorView error={c.error} onRetry={c.refresh} /> : null}
      {!c.isLoading && !c.error && c.items.length === 0 ? <Empty text={t('shelf.empty')} /> : null}
      {c.items.map((item) => (
        <CountdownRow
          key={item.id}
          item={item}
          meta={`${f.category(item.category)} · ${item.market ?? t('trips.unknownMarket')}, ${f.shortDate(item.boughtAt)}`}
          onPress={() => c.openProduct(item.id)}
        />
      ))}
    </Screen>
  );
}

function AtHome({ header, atHome }: { header: React.ReactNode; atHome: ReturnType<typeof useAtHome> }) {
  const { t } = useTranslation();
  return (
    <Screen
      header={
        <>
          {header}
          <Text variant="small" color={undefined} style={{ fontSize: 13.5, lineHeight: 19 }} muted>
            {t('atHome.explain')}
          </Text>
          <InlineAdd
            label={t('atHome.productName')}
            placeholder={t('atHome.addPlaceholder')}
            action={t('common.add')}
            onSubmit={atHome.add}
            accessory={<UnitToggle value={atHome.newUnit} onChange={atHome.setNewUnit} />}
          />
        </>
      }
      refreshing={atHome.isRefreshing}
      onRefresh={atHome.refresh}
      gap={8}>
      {atHome.isLoading ? <Loading /> : null}
      {!atHome.isLoading && atHome.error ? <ErrorView error={atHome.error} onRetry={atHome.refresh} /> : null}
      {!atHome.isLoading && !atHome.error && atHome.items.length === 0 ? <Empty text={t('atHome.empty')} /> : null}
      <View style={{ gap: 8 }}>
        {atHome.items.map((item) => (
          <HomeItemRow
            key={item.id}
            item={item}
            onStep={(direction) => atHome.step(item, direction)}
            onUnit={(unit) => atHome.changeUnit(item.id, unit)}
            onRemove={() => atHome.remove(item.id)}
          />
        ))}
      </View>
    </Screen>
  );
}
