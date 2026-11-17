import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { ApiError } from '@/lib/api';
import { AuthProvider, useAuth } from '@/lib/auth';
import { HomeProvider, useCurrentHomeState } from '@/lib/home-context';
import { useTheme } from '@/theme/use-theme';

void SplashScreen.preventAutoHideAsync();

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // Do not retry client errors such as 404 or 403.
        retry: (count, error) =>
          !(error instanceof ApiError && error.status < 500) && count < 2,
      },
    },
  });
}

export default function RootLayout() {
  const [queryClient] = useState(createQueryClient);
  const { colors, dark } = useTheme();
  const base = dark ? DarkTheme : DefaultTheme;
  return (
    <ThemeProvider
      value={{
        ...base,
        colors: { ...base.colors, background: colors.background, card: colors.card, primary: colors.primary, text: colors.text },
      }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Routes />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

function Routes() {
  const { ready, signedIn } = useAuth();
  return (
    <HomeProvider enabled={ready && signedIn}>
      <Navigator ready={ready} signedIn={signedIn} />
    </HomeProvider>
  );
}

/** One stack; guards decide which group is reachable for the current user. */
function Navigator({ ready, signedIn }: { ready: boolean; signedIn: boolean }) {
  const current = useCurrentHomeState();
  const loading = !ready || (signedIn && current === undefined);

  useEffect(() => {
    if (!loading) void SplashScreen.hideAsync();
  }, [loading]);

  if (loading) return null;
  const hasHome = signedIn && current !== null;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={hasHome}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="condition/[id]" />
        <Stack.Screen name="receipt/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="listing" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && !hasHome}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
    </Stack>
  );
}
