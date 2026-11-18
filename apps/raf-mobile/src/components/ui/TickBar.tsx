import { useState } from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme';

/**
 * The countdown bar: a row of ticks like a receipt's dotted line, filled
 * from the left for the share of shelf life still left.
 */
export function TickBar({
  progress,
  color,
  height = 10,
  tick = 2,
  gap = 3,
}: {
  /** 0..1 */
  progress: number;
  color: string;
  height?: number;
  tick?: number;
  gap?: number;
}) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const count = Math.max(0, Math.floor((width + gap) / (tick + gap)));
  const filled = Math.round(count * Math.min(1, Math.max(0, progress)));
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ height, flexDirection: 'row', gap }}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={{ width: tick, height, backgroundColor: i < filled ? color : colors.tick }} />
      ))}
    </View>
  );
}
