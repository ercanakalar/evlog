import { Pressable, StyleSheet, View } from 'react-native';
import { radius, space } from '@/constants/layout';
import { useTheme } from '@/theme';
import type { CardProps } from '@/types/components/ui';

export function Card({ children, tone = 'default', style, onPress, accessibilityLabel }: CardProps) {
  const { colors } = useTheme();
  const backgroundColor = {
    default: colors.card,
    primary: colors.primary,
    warm: colors.warmBg,
    success: colors.successBg,
    muted: colors.cardMuted,
  }[tone];
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
  card: { borderRadius: radius.lg, padding: space.lg, gap: space.sm },
});
