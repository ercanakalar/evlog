import { NavigationContainer } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAppBootstrap } from '@/hooks/app/useAppBootstrap';
import { linking } from '@/navigators/linking';
import { navigationRef } from '@/navigators/navigationRef';
import { RootNavigator } from '@/navigators/RootNavigator';
import { store } from '@/store';
import { FONT_ASSETS, ThemeProvider, useTheme } from '@/theme';

/** Provider tree: Redux → theme → safe area → navigation. */
export default function App() {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <SafeAreaProvider>
          <AppContent />
        </SafeAreaProvider>
      </ThemeProvider>
    </Provider>
  );
}

function AppContent() {
  useAppBootstrap();
  const theme = useTheme();
  // A failed font load falls back to the system font rather than blocking the app.
  const [loaded, error] = useFonts(FONT_ASSETS);
  return (
    <NavigationContainer ref={navigationRef} theme={theme.navigation} linking={linking}>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <RootNavigator fontsReady={loaded || Boolean(error)} />
    </NavigationContainer>
  );
}
