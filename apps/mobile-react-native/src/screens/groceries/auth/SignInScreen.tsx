import * as WebBrowser from 'expo-web-browser';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GoogleButton } from '@/components/groceries/auth/GoogleButton';
import { ReceiptHero } from '@/components/groceries/brand/ReceiptHero';
import { Button, FormField, Segmented, Text } from '@/components/ui';
import { space } from '@/constants/layout';
import { useAuthForm, type AuthMode } from '@/hooks/groceries/auth/useAuthForms';
import { useTheme } from '@/theme';

// Closes the Google pop-up on web once it redirects back.
WebBrowser.maybeCompleteAuthSession();

export function SignInScreen() {
  const { t } = useTranslation('groceries');
  const { colors } = useTheme();
  const auth = useAuthForm();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.accent }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }} bounces={false}>
          <ReceiptHero
            title={t('common.appName').toLocaleUpperCase()}
            lines={[
              [t('auth.hero.chicken'), t('countdown.today').toLocaleUpperCase()],
              [t('auth.hero.spinach'), t('countdown.days', { count: 2 }).toLocaleUpperCase()],
              [t('auth.hero.milk'), t('countdown.days', { count: 5 }).toLocaleUpperCase()],
            ]}
          />
          <SafeAreaView edges={['bottom']} style={{ flex: 1, padding: 24, paddingTop: 22, gap: 13 }}>
            <Text variant="title" accessibilityRole="header" style={{ fontSize: 28, lineHeight: 32 }}>
              {t('auth.tagline')}
            </Text>
            <Text variant="small" muted>
              {t('auth.connectHint')}
            </Text>

            <GoogleButton
              loading={auth.googleLoading}
              onIdToken={(token) => void auth.signInWithGoogle(token)}
              onUnavailable={() => auth.setServerError(t('auth.googleUnavailable'))}
            />

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
              <Text variant="caption" muted style={{ fontSize: 12 }}>
                {t('auth.orEmail')}
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
            </View>

            <Segmented<AuthMode>
              value={auth.mode}
              onChange={auth.setMode}
              options={[
                { value: 'signup', label: t('auth.signUp') },
                { value: 'login', label: t('auth.logIn') },
              ]}
            />

            <FormField
              control={auth.control}
              name="email"
              label={t('auth.email')}
              placeholder={t('auth.emailPlaceholder')}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
            />
            <FormField
              control={auth.control}
              name="password"
              label={t('auth.password')}
              placeholder={t('auth.passwordPlaceholder')}
              secureTextEntry
              autoComplete={auth.mode === 'signup' ? 'new-password' : 'current-password'}
              textContentType={auth.mode === 'signup' ? 'newPassword' : 'password'}
              onSubmitEditing={() => void auth.submit()}
            />

            {auth.serverError ? (
              <Text variant="small" color={colors.urgentText} accessibilityRole="alert">
                {auth.serverError}
              </Text>
            ) : null}

            <Button
              title={auth.mode === 'signup' ? t('auth.createAccount') : t('auth.logIn')}
              onPress={() => void auth.submit()}
              loading={auth.isLoading}
            />
          </SafeAreaView>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
