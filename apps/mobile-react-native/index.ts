import { registerRootComponent } from 'expo';
import * as SplashScreen from 'expo-splash-screen';
import './src/i18n';
import App from './App';

// Kept visible until fonts, both sessions and the user's homes are loaded (RootNavigator).
void SplashScreen.preventAutoHideAsync();

registerRootComponent(App);
