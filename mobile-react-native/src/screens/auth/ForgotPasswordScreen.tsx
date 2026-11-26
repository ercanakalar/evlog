import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { Button, FormField, Screen, ScreenHeader, Text } from '@/components/ui';
import { usePasswordReset } from '@/hooks/auth/usePasswordReset';
import { useTheme } from '@/theme';
import type { RootScreenProps } from '@/types/screens/navigation';

export function ForgotPasswordScreen({ route }: RootScreenProps<'ForgotPassword'>) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const r = usePasswordReset(route.params?.email ?? '');

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen header={<ScreenHeader back title={t('reset.title')} />}>
        <Text muted>{r.sentTo ? t('reset.sent', { email: r.sentTo }) : t('reset.intro')}</Text>
        {r.sentTo ? (
          <>
            <FormField
              control={r.codeControl}
              name="code"
              label={t('reset.code')}
              placeholder="1234 5678"
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              maxLength={12}
            />
            <FormField
              control={r.codeControl}
              name="password"
              label={t('reset.newPassword')}
              placeholder={t('auth.passwordPlaceholder')}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              onSubmitEditing={() => void r.submit()}
            />
          </>
        ) : (
          <FormField
            control={r.emailControl}
            name="email"
            label={t('auth.email')}
            placeholder={t('auth.emailPlaceholder')}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            onSubmitEditing={() => void r.sendCode()}
          />
        )}
        {r.error ? (
          <Text variant="small" color={colors.urgentText} accessibilityRole="alert">
            {r.error}
          </Text>
        ) : null}
        {r.sentTo ? (
          <>
            <Button title={t('reset.save')} loading={r.resetting} onPress={() => void r.submit()} />
            <Button title={t('reset.again')} variant="ghost" compact onPress={r.changeEmail} />
          </>
        ) : (
          <Button title={t('reset.send')} loading={r.sending} onPress={() => void r.sendCode()} />
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}
