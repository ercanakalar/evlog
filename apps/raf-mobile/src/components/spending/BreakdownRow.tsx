import { View } from 'react-native';
import { SpaceBetween, Text } from '@/components/ui';
import { useTheme } from '@/theme';

/** "Dairy & eggs ₺842.50" with a bar relative to the largest row. */
export function BreakdownRow({ name, value, share }: { name: string; value: string; share: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 6 }} accessible accessibilityLabel={`${name}, ${value}`}>
      <SpaceBetween style={{ alignItems: 'baseline' }}>
        <Text variant="bodyStrong" style={{ fontSize: 14.5 }}>
          {name}
        </Text>
        <Text variant="mono" style={{ fontSize: 14 }}>
          {value}
        </Text>
      </SpaceBetween>
      <View style={{ height: 6, backgroundColor: colors.cardMuted, borderTopRightRadius: 4, borderBottomRightRadius: 4 }}>
        <View
          style={{
            height: 6,
            width: `${Math.round(Math.max(0.02, share) * 100)}%`,
            backgroundColor: colors.ink,
            borderTopRightRadius: 4,
            borderBottomRightRadius: 4,
          }}
        />
      </View>
    </View>
  );
}
