import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { radius, space } from '@/constants/layout';
import { useTheme } from '@/theme';
import type { ButtonProps } from '@/types/components/ui';
import { Text } from './Text';

/** Full-width action. `primary` is ink, `accent` is the lime highlighter. */
export function Button({ title, onPress, variant = 'primary', trailing, loading, disabled, style, compact }: ButtonProps) {
  const { colors } = useTheme();
  const [bg, fg, border] = {
    primary: [colors.ink, colors.onInk, 'transparent'],
    accent: [colors.accent, colors.onAccent, 'transparent'],
    outline: [colors.card, colors.text, colors.text],
    ghost: ['transparent', colors.text, 'transparent'],
    danger: ['transparent', colors.urgentText, 'transparent'],
    // Outline on the dark camera screen, in both themes.
    onDark: ['transparent', '#FCFCFA', '#FCFCFA'],
  }[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        compact && styles.compact,
        { backgroundColor: bg, borderColor: border, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.content}>
          <Text variant="label" color={fg} style={{ fontSize: compact ? 14 : 15 }}>
            {title}
          </Text>
          {trailing}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compact: { minHeight: 46, borderRadius: radius.md },
  content: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
