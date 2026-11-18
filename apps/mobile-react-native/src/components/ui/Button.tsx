import Feather from '@expo/vector-icons/Feather';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { radius, space } from '@/constants/layout';
import { useTheme } from '@/theme';
import type { ButtonProps } from '@/types/components/ui';
import { Text } from './Text';

export function Button({ title, onPress, variant = 'primary', icon, loading, disabled, style }: ButtonProps) {
  const { colors } = useTheme();
  const filled = variant === 'primary';
  const fg = filled ? colors.onPrimary : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: filled ? colors.primary : 'transparent',
          borderColor: variant === 'outline' ? colors.text : 'transparent',
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          <Text variant="label" color={fg} style={icon ? { flex: 1 } : undefined}>
            {title}
          </Text>
          {icon ? (
            <View style={[styles.icon, { backgroundColor: filled ? colors.onPrimary : colors.primary }]}>
              <Feather name={icon} size={16} color={filled ? colors.primary : colors.onPrimary} />
            </View>
          ) : null}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    paddingHorizontal: space.xl,
    paddingVertical: space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  icon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
