import { Pressable, StyleSheet, View } from 'react-native';
import { HIT, radius } from '@/constants/layout';
import { useTheme } from '@/theme';
import { Text } from './Text';

/** Two or three equal options on a grey track ("Sign up | Log in", "Unopened | Opened"). */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const { colors } = useTheme();
  return (
    <View accessibilityRole="tablist" style={[styles.track, { backgroundColor: colors.cardMuted }]}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            style={[styles.option, { backgroundColor: selected ? colors.card : 'transparent' }]}>
            <Text variant="label">{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', gap: 4, padding: 3, borderRadius: radius.md + 1 },
  option: { flex: 1, height: HIT, borderRadius: radius.md - 1, alignItems: 'center', justifyContent: 'center' },
});
