import Feather from '@expo/vector-icons/Feather';
import { Pressable, StyleSheet, View } from 'react-native';
import { radius, space } from '@/constants/layout';
import { useTheme } from '@/theme';
import type { IconName } from '@/types/components/ui';
import { Text } from './Text';

export function Chip({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
}) {
  const { colors } = useTheme();
  const fg = selected ? colors.onPrimary : colors.text;
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, { backgroundColor: selected ? colors.primary : colors.card }]}>
      {icon ? <Feather name={icon} size={14} color={fg} /> : null}
      <Text variant="label" color={fg}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Checkbox styled as a chip ("Photos", "Ratings", "Heating bills"). */
export function CheckChip({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      style={[styles.chip, { backgroundColor: checked ? colors.primary : colors.card }]}>
      <View
        style={[
          styles.box,
          {
            borderColor: checked ? colors.onPrimary : colors.textMuted,
            backgroundColor: checked ? colors.onPrimary : 'transparent',
          },
        ]}>
        {checked ? <Feather name="check" size={12} color={colors.primary} /> : null}
      </View>
      <Text variant="label" color={checked ? colors.onPrimary : colors.text}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs + 2,
    paddingHorizontal: space.md + 2,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
  },
  box: { width: 16, height: 16, borderRadius: 4, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
