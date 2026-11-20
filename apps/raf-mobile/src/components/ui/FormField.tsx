import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { TextInputProps } from 'react-native';
import { Field } from './Field';

type Props<T extends FieldValues> = Omit<TextInputProps, 'value' | 'onChangeText' | 'onBlur'> & {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
};

/** Field bound to react-hook-form; validation messages are i18n keys. */
export function FormField<T extends FieldValues>({ control, name, label, ...props }: Props<T>) {
  const { t } = useTranslation();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field
          {...props}
          label={label}
          value={(field.value as string | undefined) ?? ''}
          onChangeText={field.onChange}
          onBlur={field.onBlur}
          // Messages from the zod schemas are translation keys.
          error={fieldState.error?.message ? t(fieldState.error.message as 'validation.required') : undefined}
        />
      )}
    />
  );
}
