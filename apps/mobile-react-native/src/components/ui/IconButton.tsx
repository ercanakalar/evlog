import Feather from '@expo/vector-icons/Feather';
import { Pressable } from 'react-native';
import { HIT } from '@/constants/layout';
import { useTheme } from '@/theme';
import type { IconButtonProps } from '@/types/components/ui';

/** 44 pt icon-only button; always pass a label for screen readers. */
export function IconButton({ icon, onPress, label, color, background, tone = 'plain', size = HIT, iconSize = 24, selected }: IconButtonProps) {
  const { colors } = useTheme();
  const [toneBg, toneFg] = {
    plain: ['transparent', colors.text],
    card: [colors.card, colors.text],
    ink: [colors.ink, colors.onInk],
    accent: [colors.accent, colors.onAccent],
  }[tone];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={selected === undefined ? undefined : { selected }}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: background ?? toneBg,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.7 : 1,
      })}>
      <Feather name={icon} size={iconSize} color={color ?? toneFg} />
    </Pressable>
  );
}
