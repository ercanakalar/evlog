import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/app/ErrorBoundary';
import { useAppBootstrap } from '@/hooks/app/useAppBootstrap';
import { linking } from '@/navigators/linking';
import { navigationRef } from '@/navigators/navigationRef';
import { ModalProvider } from '@/components/ui';
import { RootNavigator } from '@/navigators/RootNavigator';
import { store } from '@/store';
import { ThemeProvider, useTheme, useThemeFonts } from '@/theme';

/** Provider tree: Redux → error boundary → theme → safe area → modal → navigation. */
export default function App() {
  return (
    <Provider store={store}>
      <ErrorBoundary>
        <ThemeProvider>
          <SafeAreaProvider>
            <ModalProvider>
              <AppContent />
            </ModalProvider>
          </SafeAreaProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </Provider>
  );
}

function AppContent() {
  useAppBootstrap();
  const theme = useTheme();
  const fontsReady = useThemeFonts();
  return (
    <NavigationContainer ref={navigationRef} theme={theme.navigation} linking={linking}>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <RootNavigator fontsReady={fontsReady} />
    </NavigationContainer>
  );
}
