import * as Google from 'expo-auth-session/providers/google';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Platform, Pressable, StyleSheet } from 'react-native';
import { Text } from '@/components/ui';
import { env } from '@/config/env';
import { radius, space } from '@/constants/layout';
import { useTheme } from '@/theme';
import { GoogleLogo } from './GoogleLogo';

interface Props {
  onIdToken: (idToken: string) => void;
  loading?: boolean;
}

/**
 * Whether to offer Google. Not without client ids; and not on iOS, where
 * Apple then requires an equivalent such as Sign in with Apple.
 */
export const googleAvailable =
  Platform.OS !== 'ios' && Boolean(env.google.webClientId || env.google.androidClientId);

/** "Continue with Google". Render it only when `googleAvailable`. */
export function GoogleButton({ onIdToken, loading }: Props) {
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
  const { t } = useTranslation();
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
