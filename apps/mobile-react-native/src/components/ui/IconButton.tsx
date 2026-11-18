import Feather from '@expo/vector-icons/Feather';
import { Pressable } from 'react-native';
import { useTheme } from '@/theme';
import type { IconButtonProps } from '@/types/components/ui';

export function IconButton({ icon, onPress, label, tone = 'primary', size = 36 }: IconButtonProps) {
  const { colors } = useTheme();
  const backgroundColor = { primary: colors.primary, card: colors.card, light: '#FFFFFF' }[tone];
  const color = tone === 'primary' ? colors.onPrimary : tone === 'light' ? colors.primary : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.8 : 1,
      })}>
      <Feather name={icon} size={size * 0.48} color={color} />
    </Pressable>
  );
}
