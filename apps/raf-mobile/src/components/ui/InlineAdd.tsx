import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { radius, space } from '@/constants/layout';
import { useTheme } from '@/theme';
import { Field } from './Field';
import { Text } from './Text';

/** "Add a product [Add]": a one-line input with its button. */
export function InlineAdd({
  label,
  placeholder,
  action,
  onSubmit,
  tone = 'ink',
  accessory,
}: {
  label: string;
  placeholder: string;
  action: string;
  onSubmit: (value: string) => void | Promise<unknown>;
  tone?: 'ink' | 'accent';
  /** Shown between the field and the button (e.g. a unit switch). */
  accessory?: ReactNode;
}) {
  const { colors } = useTheme();
  const [value, setValue] = useState('');
  const submit = () => {
    const name = value.trim();
    if (!name) return;
    setValue('');
    void onSubmit(name);
  };
  const [bg, fg] = tone === 'accent' ? [colors.accent, colors.onAccent] : [colors.ink, colors.onInk];
  return (
    <View style={{ flexDirection: 'row', gap: space.sm }}>
      <Field
        label={label}
        hideLabel
        value={value}
        onChangeText={setValue}
        placeholder={placeholder}
        returnKeyType="done"
        onSubmitEditing={submit}
      />
      {accessory}
      <Pressable
        accessibilityRole="button"
        onPress={submit}
        style={({ pressed }) => ({
          minWidth: accessory ? 60 : 72,
          height: 46,
          paddingHorizontal: space.md,
          borderRadius: radius.md,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.85 : 1,
        })}>
        <Text variant="label" color={fg}>
          {action}
        </Text>
      </Pressable>
    </View>
  );
}
