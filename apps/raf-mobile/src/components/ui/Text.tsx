import { StyleSheet, Text as RNText } from 'react-native';
import { fonts, useTheme } from '@/theme';
import type { TextProps } from '@/types/components/ui';

export function Text({ children, variant = 'body', muted, color, style, numberOfLines, accessibilityRole, accessibilityLabel }: TextProps) {
  const { colors } = useTheme();
  return (
    <RNText
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      numberOfLines={numberOfLines}
      style={[styles[variant], { color: color ?? (muted ? colors.textMuted : colors.text) }, style]}>
      {children}
    </RNText>
  );
}

/** Inter for text, Space Grotesk for headings, JetBrains Mono for amounts and receipt text. */
const styles = StyleSheet.create({
  title: { fontFamily: fonts.headingBold, fontSize: 26, letterSpacing: -0.26 },
  screenTitle: { fontFamily: fonts.headingBold, fontSize: 22 },
  heading: { fontFamily: fonts.heading, fontSize: 18 },
  subheading: { fontFamily: fonts.heading, fontSize: 16 },
  body: { fontFamily: fonts.body, fontSize: 15 },
  bodyMedium: { fontFamily: fonts.bodyMedium, fontSize: 15 },
  bodyStrong: { fontFamily: fonts.bodySemiBold, fontSize: 15 },
  label: { fontFamily: fonts.bodySemiBold, fontSize: 14 },
  small: { fontFamily: fonts.body, fontSize: 13 },
  smallMedium: { fontFamily: fonts.bodyMedium, fontSize: 13 },
  caption: { fontFamily: fonts.bodyMedium, fontSize: 11 },
  amountXL: { fontFamily: fonts.monoBold, fontSize: 40, lineHeight: 44, letterSpacing: -1.6 },
  amountL: { fontFamily: fonts.monoBold, fontSize: 36, lineHeight: 40, letterSpacing: -1.4 },
  amount: { fontFamily: fonts.monoBold, fontSize: 15 },
  mono: { fontFamily: fonts.monoMedium, fontSize: 12.5 },
  monoBold: { fontFamily: fonts.monoBold, fontSize: 13 },
  monoSmall: { fontFamily: fonts.monoMedium, fontSize: 11.5 },
});
