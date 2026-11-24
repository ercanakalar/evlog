import { registerRootComponent } from 'expo';
import * as SplashScreen from 'expo-splash-screen';
import './src/i18n';
import App from './App';

// Kept visible until the session and fonts are loaded (RootNavigator).
void SplashScreen.preventAutoHideAsync();

registerRootComponent(App);
