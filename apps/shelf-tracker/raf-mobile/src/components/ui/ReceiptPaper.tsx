import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme';

const TOOTH = 12;

/** The torn, zig-zag bottom edge of a receipt. */
export function ReceiptEdge({ color }: { color?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.edge} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: 48 }, (_, i) => (
        <View key={i} style={[styles.tooth, { backgroundColor: color ?? colors.card }]} />
      ))}
    </View>
  );
}

/** Square-cornered paper with a torn edge: summaries, receipts, the product countdown. */
export function ReceiptPaper({
  children,
  style,
  onPress,
  accessibilityLabel,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const body = (
    <View>
      <View style={[{ backgroundColor: colors.card, padding: 18, gap: 6 }, style]}>{children}</View>
      <ReceiptEdge />
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  edge: { height: TOOTH / 2 + 2, flexDirection: 'row', overflow: 'hidden' },
  // Squares turned 45° and pushed up: only their lower halves show, as teeth.
  tooth: {
    width: TOOTH / Math.SQRT2,
    height: TOOTH / Math.SQRT2,
    marginTop: -TOOTH / (2 * Math.SQRT2),
    marginHorizontal: (TOOTH - TOOTH / Math.SQRT2) / 2,
    transform: [{ rotate: '45deg' }],
  },
});
