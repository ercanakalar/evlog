import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, View } from 'react-native';
import { radius, space } from '@/constants/layout';
import { useTheme } from '@/theme';
import type { BadgeTone, IconName } from '@/types/components/ui';
import { Text } from './Text';

export function Badge({ label, tone = 'neutral', icon }: { label: string; tone?: BadgeTone; icon?: IconName }) {
  const { colors } = useTheme();
  const [bg, fg] = {
    neutral: [colors.cardMuted, colors.text],
    success: [colors.successBg, colors.successText],
    danger: [colors.dangerBg, colors.dangerText],
    ink: [colors.ink, colors.onInk],
    accent: [colors.accent, colors.onAccent],
  }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      {icon ? <Feather name={icon} size={11} color={fg} /> : null}
      <Text variant="caption" color={fg}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
});
