import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { z } from 'zod';
import { Button, Chip, Field, Row, Screen, T } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/theme/use-theme';

// Mirrors the API's RegisterDto so most mistakes are caught before a request.
const signInSchema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
});
const signUpSchema = signInSchema.extend({
  fullName: z.string().trim().min(1, 'Enter your name').max(120),
  password: z
    .string()
    .min(8, 'At least 8 characters')
    .regex(/[a-z]/, 'Add a lower-case letter')
    .regex(/[A-Z]/, 'Add an upper-case letter')
    .regex(/\d/, 'Add a digit'),
});
type Form = z.infer<typeof signUpSchema>;

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const { colors } = useTheme();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [serverError, setServerError] = useState<string>();
  const { control, handleSubmit, formState } = useForm<Form>({
    resolver: zodResolver(mode === 'in' ? (signInSchema as unknown as typeof signUpSchema) : signUpSchema),
    defaultValues: { email: '', password: '', fullName: '' },
  });

  const submit = handleSubmit(async (values) => {
    setServerError(undefined);
    try {
      if (mode === 'in') await signIn(values.email, values.password);
      else await signUp(values);
    } catch (error) {
      setServerError(error instanceof ApiError ? error.messages.join('\n') : 'Could not reach the server');
    }
  });

  return (
    <Screen>
      <View style={{ marginTop: 48, gap: 6 }}>
        <T variant="title">Evlog</T>
        <T muted>A shared, verified record of your home — for owners and tenants.</T>
      </View>
      <Row style={{ marginVertical: 12 }}>
        <Chip label="Sign in" selected={mode === 'in'} onPress={() => setMode('in')} />
        <Chip label="Create account" selected={mode === 'up'} onPress={() => setMode('up')} />
      </Row>

      {mode === 'up' ? (
        <Controller
          control={control}
          name="fullName"
          render={({ field, fieldState }) => (
            <Field
              label="Full name"
              autoComplete="name"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
            />
          )}
        />
      ) : null}
      <Controller
        control={control}
        name="email"
        render={({ field, fieldState }) => (
          <Field
            label="Email"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field, fieldState }) => (
          <Field
            label="Password"
            secureTextEntry
            autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
          />
        )}
      />
      {serverError ? <T color={colors.dangerText}>{serverError}</T> : null}
      <Button
        title={mode === 'in' ? 'Sign in' : 'Create account'}
        icon="arrow-right"
        loading={formState.isSubmitting}
        onPress={submit}
      />
    </Screen>
  );
}
