import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { HIT, radius, space } from '@/constants/layout';
import { useTheme } from '@/theme';
import { Text } from './Text';

/** Outlined pill filter; the selected one is filled with ink. */
export function Chip({
  label,
  selected,
  onPress,
  onLongPress,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.chip,
        { borderColor: colors.text, backgroundColor: selected ? colors.ink : 'transparent', opacity: pressed ? 0.8 : 1 },
      ]}>
      <Text variant="label" color={selected ? colors.onInk : colors.text} style={{ fontSize: 13.5 }}>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
});
