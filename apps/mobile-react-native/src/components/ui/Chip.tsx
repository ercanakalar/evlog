import Feather from '@expo/vector-icons/Feather';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { HIT, radius, space } from '@/constants/layout';
import { useTheme } from '@/theme';
import type { IconName } from '@/types/components/ui';
import { Text } from './Text';

/** Outlined pill filter; the selected one is filled with ink. */
export function Chip({
  label,
  selected,
  onPress,
  onLongPress,
  icon,
}: {
  label: string;
  selected?: boolean;
  /** Without a handler the chip is a static label. */
  onPress?: () => void;
  onLongPress?: () => void;
  icon?: IconName;
}) {
  const { colors } = useTheme();
  const fg = selected ? colors.onInk : colors.text;
  return (
    <Pressable
      disabled={!onPress && !onLongPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={{ selected }}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.chip,
        { borderColor: colors.text, backgroundColor: selected ? colors.ink : 'transparent', opacity: pressed ? 0.8 : 1 },
      ]}>
      {icon ? <Feather name={icon} size={14} color={fg} /> : null}
      <Text variant="label" color={fg} style={{ fontSize: 13.5 }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** A checkbox drawn as a chip ("Photos", "Ratings", "Heating bills"). */
export function CheckChip({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  const { colors } = useTheme();
  const fg = checked ? colors.onInk : colors.text;
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      style={({ pressed }) => [
        styles.chip,
        { borderColor: colors.text, backgroundColor: checked ? colors.ink : 'transparent', opacity: pressed ? 0.8 : 1 },
      ]}>
      <View style={[styles.box, { borderColor: fg, backgroundColor: checked ? colors.accent : 'transparent' }]}>
        {checked ? <Feather name="check" size={12} color={colors.onAccent} /> : null}
      </View>
      <Text variant="label" color={fg} style={{ fontSize: 13.5 }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** A row of chips that scrolls sideways, edge to edge. */
export function ChipRow<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name of the group, e.g. "Filter by category". */
  label: string;
}) {
  return (
    <ScrollView
      horizontal
      accessibilityLabel={label}
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -space.xl, flexGrow: 0 }}
      contentContainerStyle={{ paddingHorizontal: space.xl, gap: 6 }}>
      {options.map((o) => (
        <Chip key={o.value} label={o.label} selected={o.value === value} onPress={() => onChange(o.value)} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: HIT,
    minWidth: 56,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: { width: 16, height: 16, borderRadius: 4, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
