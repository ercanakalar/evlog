import Feather from '@expo/vector-icons/Feather';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Tag, Text } from '@/components/ui';
import { HIT, radius } from '@/constants/layout';
import { useFormatters } from '@/hooks/common/useFormatters';
import { useTheme } from '@/theme';
import type { HomeItem } from '@/types/api/models';

/** "Whole milk  [+2 from Migros, 16 Nov]   − 3 +". Long-press to remove. */
export function HomeItemRow({
  item,
  onChange,
  onRemove,
}: {
  item: HomeItem;
  onChange: (count: number) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const f = useFormatters();
  const match =
    item.lastMatchAdded && item.lastMatchAt
      ? t('atHome.matched', {
          count: item.lastMatchAdded,
          market: item.lastMatchMarket ?? t('trips.unknownMarket'),
          date: f.shortDate(item.lastMatchAt),
        })
      : null;
  return (
    <Pressable
      onLongPress={() =>
        Alert.alert(t('atHome.removeTitle', { name: item.name }), undefined, [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('atHome.remove'), style: 'destructive', onPress: onRemove },
        ])
      }
      accessibilityHint={t('atHome.removeHint')}
      style={[styles.row, { backgroundColor: colors.card }]}>
      <View style={{ flexShrink: 1, gap: 3, alignItems: 'flex-start' }}>
        <Text variant="bodyStrong">{item.name}</Text>
        {match ? <Tag label={match} tone="accent" /> : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('atHome.less', { name: item.name })}
          disabled={item.count === 0}
          onPress={() => onChange(item.count - 1)}
          style={[styles.step, { opacity: item.count === 0 ? 0.35 : 1 }]}>
          <Feather name="minus" size={20} color={colors.text} />
        </Pressable>
        <Text variant="amount" style={{ width: 28, textAlign: 'center', fontSize: 17 }}>
          {item.count}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('atHome.more', { name: item.name })}
          onPress={() => onChange(item.count + 1)}
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
