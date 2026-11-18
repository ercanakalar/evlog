import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';
import { ListItemRow } from '@/components/lists/ListItemRow';
import {
  Button,
  Chip,
  Empty,
  ErrorView,
  FooterBar,
  InlineAdd,
  Loading,
  Screen,
  ScreenHeader,
  SpaceBetween,
  Text,
} from '@/components/ui';
import { HIT, radius, space } from '@/constants/layout';
import { useFormatters } from '@/hooks/common/useFormatters';
import { useLists } from '@/hooks/lists/useLists';
import { useGetMeQuery } from '@/store/services/meService';
import { useTheme } from '@/theme';

export function ListsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const f = useFormatters();
  const l = useLists();
  const currency = useGetMeQuery().data?.currency;

  const header = (
    <>
      <ScreenHeader
        title={t('lists.title')}
        action={
          <Button
            title={l.creating ? t('common.cancel') : t('lists.new')}
            variant="outline"
            compact
            onPress={l.toggleCreating}
            style={{ minHeight: HIT, paddingHorizontal: 14, backgroundColor: 'transparent' }}
          />
        }
      />
      {l.creating ? (
        <InlineAdd
          label={t('lists.name')}
          placeholder={t('lists.name')}
          action={t('lists.create')}
          tone="accent"
          onSubmit={l.create}
        />
      ) : null}
      {l.lists.length > 0 ? (
        <ScrollView
          horizontal
          accessibilityLabel={t('lists.yourLists')}
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -space.xl, flexGrow: 0 }}
          contentContainerStyle={{ paddingHorizontal: space.xl, gap: 6 }}>
          {l.lists.map((list) => (
            <Pressable key={list.id} onLongPress={() => l.confirmDelete(list.id, list.name)}>
              <Chip label={list.name} selected={list.id === l.active?.id} onPress={() => l.select(list.id)} />
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
      {l.active ? (
        <InlineAdd label={t('lists.productToAdd')} placeholder={t('lists.addProduct')} action={t('common.add')} onSubmit={l.add} />
      ) : null}
    </>
  );

  if (l.isLoading) return <Loading />;
  if (l.error && l.lists.length === 0) return <ErrorView error={l.error} onRetry={l.refresh} />;

  return (
    <Screen
      header={header}
      refreshing={l.isRefreshing}
      onRefresh={l.refresh}
      gap={6}
      footer={
        l.active ? (
          <FooterBar inset={false}>
            <SpaceBetween>
              <Text variant="smallMedium" color={colors.textSoft} style={{ flexShrink: 1 }}>
                {t('lists.left', { count: l.remaining })}
              </Text>
              <Text variant="amount" style={{ fontSize: 17 }}>
                {f.money(l.estimate, currency)}
              </Text>
            </SpaceBetween>
          </FooterBar>
        ) : undefined
      }>
      {l.lists.length === 0 ? <Empty text={t('lists.noLists')} /> : null}
      {l.active && l.active.items.length === 0 ? <Empty text={t('lists.emptyList')} /> : null}
      {l.active?.items.map((item) => (
        <ListItemRow
          key={item.id}
          item={item}
          currency={currency}
          onToggle={() => l.toggle(item.id, !item.done)}
          onRemove={() => l.removeItem(item.id)}
        />
      ))}

      {l.active && l.runningLow.length > 0 ? (
        <View style={{ gap: 6, paddingTop: 10 }}>
          <Text variant="subheading" style={{ fontSize: 15 }} accessibilityRole="header">
            {t('lists.runningLow')}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {l.runningLow.map((low) => (
              <Pressable
                key={low.homeItemId}
                accessibilityRole="button"
                accessibilityLabel={t('lists.addLow', { name: low.name })}
                onPress={() => void l.add(low.name)}
                style={({ pressed }) => ({
                  height: HIT,
                  paddingHorizontal: 12,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderStyle: 'dashed',
                  borderColor: colors.text,
                  justifyContent: 'center',
                  opacity: pressed ? 0.7 : 1,
                })}>
                <Text variant="smallMedium" style={{ fontSize: 13.5 }}>
                  {t('lists.lowChip', { name: low.name, count: low.count })}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
    </Screen>
  );
}
