import Feather from '@expo/vector-icons/Feather';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { Tag, Text, useModal } from '@/components/ui';
import { HIT, radius } from '@/constants/layout';
import { useFormatters } from '@/hooks/common/useFormatters';
import { useTheme } from '@/theme';
import type { HomeItem, HomeUnit } from '@/types/api/models';

/**
 * "Whole milk  [+2 from Migros, 16 Nov]   − 3 +", or "− 1.2 kg +" for a
 * product counted by weight. Long-press to switch piece / kg or remove.
 */
export function HomeItemRow({
  item,
  onStep,
  onUnit,
  onRemove,
}: {
  item: HomeItem;
  onStep: (direction: 1 | -1) => void;
  onUnit: (unit: HomeUnit) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const f = useFormatters();
  const modal = useModal();
  const amount = f.homeAmount(item.count, item.unit);
  const match =
    item.lastMatchAdded && item.lastMatchAt
      ? t('atHome.matched', {
          amount: f.homeAmount(item.lastMatchAdded, item.unit),
          market: item.lastMatchMarket ?? t('trips.unknownMarket'),
          date: f.shortDate(item.lastMatchAt),
        })
      : null;
  const other: HomeUnit = item.unit === 'KG' ? 'PIECE' : 'KG';

  const openMenu = () =>
    modal.choose({
      title: item.name,
      message: t(item.unit === 'KG' ? 'atHome.countedKg' : 'atHome.countedPieces'),
      choices: [
        { label: t(other === 'KG' ? 'atHome.useKg' : 'atHome.usePieces'), onPress: () => onUnit(other) },
        { label: t('atHome.remove'), destructive: true, onPress: onRemove },
      ],
    });

  return (
    <Pressable
      onLongPress={openMenu}
      accessibilityHint={t('atHome.menuHint')}
      accessibilityActions={[{ name: 'longpress', label: t('atHome.options') }]}
      onAccessibilityAction={openMenu}
      style={[styles.row, { backgroundColor: colors.card }]}>
      <View style={{ flexShrink: 1, gap: 3, alignItems: 'flex-start' }}>
        <Text variant="bodyStrong">{item.name}</Text>
        {match ? <Tag label={match} tone="accent" /> : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(item.unit === 'KG' ? 'atHome.lessKg' : 'atHome.less', { name: item.name })}
          disabled={item.count === 0}
          onPress={() => onStep(-1)}
          style={[styles.step, { opacity: item.count === 0 ? 0.35 : 1 }]}>
          <Feather name="minus" size={20} color={colors.text} />
        </Pressable>
        <Text
          variant="amount"
          accessibilityLabel={t('atHome.amountLabel', { amount })}
          style={{ minWidth: 28, textAlign: 'center', fontSize: item.unit === 'KG' ? 15 : 17 }}>
          {amount}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(item.unit === 'KG' ? 'atHome.moreKg' : 'atHome.more', { name: item.name })}
          onPress={() => onStep(1)}
          style={styles.step}>
          <Feather name="plus" size={20} color={colors.text} />
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 58,
    borderRadius: radius.md,
    paddingVertical: 7,
    paddingLeft: 14,
    paddingRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  step: { width: HIT, height: HIT, alignItems: 'center', justifyContent: 'center' },
});
