import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { radius, space } from '@/constants/layout';
import { useTheme } from '@/theme';
import { Text } from './Text';

export function Field({ label, error, style, ...props }: TextInputProps & { label?: string; error?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: space.xs }}>
      {label ? <Text variant="label">{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.textMuted}
        accessibilityLabel={label ?? props.placeholder}
        {...props}
        style={[
          styles.input,
          { backgroundColor: colors.card, color: colors.text, borderColor: error ? colors.dangerText : colors.border },
          style,
        ]}
      />
      {error ? (
        <Text variant="caption" color={colors.dangerText}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    fontSize: 15,
  },
});
