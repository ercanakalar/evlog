import { View } from 'react-native';
import { Card, SpaceBetween, Text, TickBar } from '@/components/ui';
import { useFormatters } from '@/hooks/groceries/common/useFormatters';
import { useTheme } from '@/theme';
import type { ShelfItem } from '@/types/api/groceries/models';
import { countdownColors, countdownProgress } from '@/utils/groceries/countdown';

/** A product card with its countdown: name, days left, and the tick bar. */
export function CountdownRow({ item, meta, onPress }: { item: ShelfItem; meta?: string; onPress: () => void }) {
  const { colors } = useTheme();
  const f = useFormatters();
  const tone = countdownColors(item.daysLeft, colors);
  const left = f.left(item.daysLeft);
  return (
    <Card onPress={onPress} accessibilityLabel={`${item.name}, ${left}`} style={{ gap: meta ? 6 : 7, paddingBottom: 12 }}>
      <SpaceBetween style={{ alignItems: 'baseline' }}>
        <Text variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
          {item.name}
        </Text>
        <Text variant="monoBold" color={tone.text}>
          {left.toLocaleUpperCase()}
        </Text>
      </SpaceBetween>
      {meta ? (
        <Text variant="small" muted style={{ fontSize: 12.5 }}>
          {meta}
        </Text>
      ) : null}
      <View style={{ marginTop: meta ? 2 : 0 }}>
        <TickBar progress={countdownProgress(item.daysLeft, item.totalDays)} color={tone.bar} />
      </View>
    </Card>
  );
}
