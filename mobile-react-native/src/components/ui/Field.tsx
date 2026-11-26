import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { radius, space } from '@/constants/layout';
import { useTheme } from '@/theme';
import { Text } from './Text';

type FieldProps = TextInputProps & {
  label: string;
  /** Keep the label for screen readers only (e.g. "Add a product" rows). */
  hideLabel?: boolean;
  error?: string;
};

export function Field({ label, hideLabel, error, style, ...props }: FieldProps) {
  const { colors, fonts } = useTheme();
  return (
    <View style={{ gap: 5, flex: hideLabel ? 1 : undefined }}>
      {hideLabel ? null : <Text variant="smallMedium">{label}</Text>}
      <TextInput
        placeholderTextColor={colors.textMuted}
        accessibilityLabel={label}
        {...props}
        style={[
          styles.input,
          {
            fontFamily: fonts.body,
            backgroundColor: colors.card,
            color: colors.text,
            borderColor: error ? colors.urgentText : colors.inputBorder,
          },
          style,
        ]}
      />
      {error ? (
        <Text variant="small" color={colors.urgentText}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    height: 46,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space.md + 2,
    fontSize: 15,
  },
});
