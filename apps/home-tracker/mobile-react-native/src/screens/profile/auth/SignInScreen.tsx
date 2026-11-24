import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Button, FormField, Screen, Text } from '@/components/ui';
import { useSignInForm } from '@/hooks/auth/useAuthForms';
import { useTheme } from '@/theme';
import type { RootScreenProps } from '@/types/screens/navigation';

export function SignInScreen({ navigation }: RootScreenProps<'SignIn'>) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { control, submit, isLoading, serverError } = useSignInForm();
  return (
    <Screen>
      <View style={{ marginTop: 48, marginBottom: 12, gap: 6 }}>
        <Text variant="title">{t('common.appName')}</Text>
        <Text muted>{t('auth.tagline')}</Text>
      </View>
      <FormField
        control={control}
        name="email"
        label={t('auth.email')}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
      />
      <FormField control={control} name="password" label={t('auth.password')} secureTextEntry autoComplete="current-password" />
      {serverError ? <Text color={colors.dangerText}>{serverError}</Text> : null}
      <Button title={t('auth.signIn')} icon="arrow-right" loading={isLoading} onPress={() => void submit()} />
      <Button title={t('auth.noAccount')} variant="ghost" onPress={() => navigation.navigate('SignUp')} />
      <Button title={t('profile.legal')} variant="ghost" onPress={() => navigation.navigate('Legal', { document: 'privacy' })} />
    </Screen>
  );
}
