import * as Google from 'expo-auth-session/providers/google';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { Text } from '@/components/ui';
import { env } from '@/config/env';
import { radius, space } from '@/constants/layout';
import { useTheme } from '@/theme';
import { GoogleLogo } from '@/components/groceries/auth/GoogleLogo';

interface Props {
  onIdToken: (idToken: string) => void;
  onUnavailable: () => void;
  loading?: boolean;
}

const configured = Boolean(env.google.webClientId || env.google.iosClientId || env.google.androidClientId);

/**
 * "Continue with Google". Without client ids in .env the button stays,
 * but explains that Google sign-in is not set up yet.
 */
export function GoogleButton(props: Props) {
  return configured ? <ConfiguredGoogleButton {...props} /> : <GoogleButtonView onPress={props.onUnavailable} />;
}

function ConfiguredGoogleButton({ onIdToken, loading }: Props) {
  const [request, response, prompt] = Google.useIdTokenAuthRequest({
    webClientId: env.google.webClientId,
    iosClientId: env.google.iosClientId,
    androidClientId: env.google.androidClientId,
    selectAccount: true,
  });

  useEffect(() => {
    if (response?.type !== 'success') return;
    const idToken = response.params.id_token ?? response.authentication?.idToken;
    if (idToken) onIdToken(idToken);
  }, [response, onIdToken]);

  return <GoogleButtonView onPress={() => void prompt()} disabled={!request} loading={loading} />;
}

function GoogleButtonView({ onPress, disabled, loading }: { onPress: () => void; disabled?: boolean; loading?: boolean }) {
  const { t } = useTranslation('groceries');
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: colors.card, borderColor: colors.text, opacity: pressed || disabled ? 0.8 : 1 },
      ]}>
      {loading ? <ActivityIndicator color={colors.text} /> : <GoogleLogo />}
      <Text variant="label" style={{ fontSize: 15 }}>
        {t('auth.google')}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderWidth: 1.5,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm + 2,
  },
});
