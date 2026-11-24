import { StyleSheet, Text as RNText } from 'react-native';
import { useTheme } from '@/theme';
import type { TextProps } from '@/types/components/ui';

export function Text({ children, variant = 'body', muted, color, style, numberOfLines }: TextProps) {
  const { colors } = useTheme();
  return (
    <RNText
      numberOfLines={numberOfLines}
      style={[styles[variant], { color: color ?? (muted ? colors.textMuted : colors.text) }, style]}>
      {children}
    </RNText>
  );
}

const styles = StyleSheet.create({
  display: { fontSize: 44, fontWeight: '800', letterSpacing: -1 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  heading: { fontSize: 17, fontWeight: '700' },
  body: { fontSize: 15 },
  label: { fontSize: 14, fontWeight: '600' },
  caption: { fontSize: 12 },
});
