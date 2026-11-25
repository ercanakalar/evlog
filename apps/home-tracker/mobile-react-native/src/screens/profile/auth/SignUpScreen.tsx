import { useTranslation } from 'react-i18next';
import { Button, Chip, FormField, Row, Screen, ScreenHeader, Text } from '@/components/ui';
import { useSignUpForm } from '@/hooks/auth/useAuthForms';
import { useTheme } from '@/theme';
import type { RootScreenProps } from '@/types/screens/navigation';

export function SignUpScreen({ navigation }: RootScreenProps<'SignUp'>) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { control, submit, isLoading, serverError } = useSignUpForm();
  return (
    <Screen>
      <ScreenHeader back title={t('auth.signUp')} />
      <FormField control={control} name="fullName" label={t('auth.fullName')} autoComplete="name" />
      <FormField
        control={control}
        name="email"
        label={t('auth.email')}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
      />
      <FormField control={control} name="password" label={t('auth.password')} secureTextEntry autoComplete="new-password" />
      {serverError ? <Text color={colors.dangerText}>{serverError}</Text> : null}
      <Text variant="caption" muted>
        {t('auth.agree')}
      </Text>
      <Row style={{ flexWrap: 'wrap' }}>
        <Chip label={t('legal.terms')} selected={false} onPress={() => navigation.navigate('Legal', { document: 'terms' })} />
        <Chip label={t('legal.privacy')} selected={false} onPress={() => navigation.navigate('Legal', { document: 'privacy' })} />
      </Row>
      <Button title={t('auth.signUp')} icon="arrow-right" loading={isLoading} onPress={() => void submit()} />
      <Button title={t('auth.haveAccount')} variant="ghost" onPress={() => navigation.goBack()} />
    </Screen>
  );
}
