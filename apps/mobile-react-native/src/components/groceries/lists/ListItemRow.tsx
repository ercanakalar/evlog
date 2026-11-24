import Feather from '@expo/vector-icons/Feather';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useModal } from '@/components/ui';
import { radius } from '@/constants/layout';
import { useFormatters } from '@/hooks/groceries/common/useFormatters';
import { useTheme } from '@/theme';
import type { ShoppingListItem } from '@/types/api/groceries/models';

/** A tickable list line with the price paid last time. Long-press to remove. */
export function ListItemRow({
  item,
  currency,
  onToggle,
  onRemove,
}: {
  item: ShoppingListItem;
  currency?: string;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation('groceries');
  const { colors } = useTheme();
  const f = useFormatters();
  const modal = useModal();
  const color = item.done ? colors.textMuted : colors.text;
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: item.done }}
      accessibilityHint={t('lists.removeHint')}
      onPress={onToggle}
      onLongPress={() =>
        modal.confirm({
          title: t('lists.removeTitle', { name: item.name }),
          confirmLabel: t('lists.remove'),
          destructive: true,
          onConfirm: onRemove,
        })
      }
      style={[styles.row, { backgroundColor: colors.card }]}>
      <View
        style={[
          styles.box,
          { borderColor: colors.text, backgroundColor: item.done ? colors.accent : 'transparent' },
        ]}>
        {item.done ? <Feather name="check" size={16} color={colors.onAccent} /> : null}
      </View>
      <Text
        variant="bodyMedium"
        color={color}
        style={{ flex: 1, textDecorationLine: item.done ? 'line-through' : 'none' }}>
        {item.name}
      </Text>
      <Text variant="mono" color={color} style={{ fontSize: 13.5 }}>
        {item.lastPrice === null ? t('lists.noPrice') : f.money(item.lastPrice, currency)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 52,
    borderRadius: radius.md,
    paddingVertical: 6,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
