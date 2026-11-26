import { Pressable, StyleSheet, View } from 'react-native';
import { radius } from '@/constants/layout';
import { useTheme } from '@/theme';
import type { CardProps } from '@/types/components/ui';

/** A slip of receipt paper. `ink` is the dark variant (receipt header, account). */
export function Card({ children, tone = 'paper', style, onPress, accessibilityLabel }: CardProps) {
  const { colors } = useTheme();
  const backgroundColor = { paper: colors.card, ink: colors.ink }[tone];
  const body = <View style={[styles.card, { backgroundColor }, style]}>{children}</View>;
  if (!onPress) return body;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, gap: 6 },
});
