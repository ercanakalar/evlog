import { exchangeCodeAsync } from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Platform, Pressable, StyleSheet } from 'react-native';
import { Text } from '@/components/ui';
import { env } from '@/config/env';
import { radius, space } from '@/constants/layout';
import { useTheme } from '@/theme';
import { GoogleLogo } from './GoogleLogo';

interface Props {
  onIdToken: (idToken: string) => void;
  /** Google refused, or the code could not be exchanged; `reason` is Google's. */
  onError: (reason: string) => void;
  loading?: boolean;
}

/**
 * Whether to offer Google. Not without client ids; and not on iOS, where
 * Apple then requires an equivalent such as Sign in with Apple.
 */
export const googleAvailable =
  Platform.OS !== 'ios' && Boolean(env.google.webClientId || env.google.androidClientId);

/** "Continue with Google". Render it only when `googleAvailable`. */
export function GoogleButton({ onIdToken, onError, loading }: Props) {
  const [request, , prompt] = Google.useIdTokenAuthRequest({
    webClientId: env.google.webClientId,
    iosClientId: env.google.iosClientId,
    androidClientId: env.google.androidClientId,
    selectAccount: true,
    // Phones get a code to exchange for the ID token. The library's own exchange
    // drops failures and leaves the sign-in page as if nothing happened.
    shouldAutoExchangeCode: false,
  });
  const [exchanging, setExchanging] = useState(false);

  const signIn = async () => {
    if (!request) return;
    const result = await prompt();
    if (result.type === 'error') {
      onError(result.error?.description ?? result.params.error ?? result.type);
      return;
    }
    // cancel or dismiss: the account picker was closed.
    if (result.type !== 'success') return;
    // On the web Google returns the ID token itself.
    if (result.params.id_token) {
      onIdToken(result.params.id_token);
      return;
    }
    setExchanging(true);
    try {
      const tokens = await exchangeCodeAsync(
        {
          clientId: request.clientId,
          redirectUri: request.redirectUri,
          code: result.params.code ?? '',
          extraParams: { code_verifier: request.codeVerifier ?? '' },
        },
        Google.discovery,
      );
      if (tokens.idToken) onIdToken(tokens.idToken);
      else onError('no ID token');
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    } finally {
      setExchanging(false);
    }
  };

  return <GoogleButtonView onPress={() => void signIn()} disabled={!request} loading={loading || exchanging} />;
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
