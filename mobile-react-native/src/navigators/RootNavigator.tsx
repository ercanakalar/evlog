import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useExpiryReminders } from '@/hooks/app/useExpiryReminders';
import { useLiveUpdates } from '@/hooks/app/useLiveUpdates';
import { ForgotPasswordScreen } from '@/screens/auth/ForgotPasswordScreen';
import { SignInScreen } from '@/screens/auth/SignInScreen';
import { PackScanScreen } from '@/screens/packs/PackScanScreen';
import { HouseholdScreen } from '@/screens/household/HouseholdScreen';
import { HomeItemScreen } from '@/screens/shelf/HomeItemScreen';
import { ProductScreen } from '@/screens/product/ProductScreen';
import { ReceiptReviewScreen } from '@/screens/receipts/ReceiptReviewScreen';
import { ScanScreen } from '@/screens/scan/ScanScreen';
import { SettingsScreen } from '@/screens/settings/SettingsScreen';
import { SpendingScreen } from '@/screens/spending/SpendingScreen';
import { TripDetailScreen } from '@/screens/trips/TripDetailScreen';
import { useAppSelector } from '@/store/hooks';
import { selectAuthStatus } from '@/store/slices/authSlice';
import type { RootStackParamList } from '@/types/screens/navigation';
import { TabNavigator } from './TabNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

/** Which screens exist depends on the auth state; React Navigation switches groups when it changes. */
export function RootNavigator({ fontsReady }: { fontsReady: boolean }) {
  const status = useAppSelector(selectAuthStatus);
  const signedIn = status === 'signedIn';
  const loading = status === 'restoring' || !fontsReady;
  useExpiryReminders(signedIn);
  useLiveUpdates(signedIn);

  useEffect(() => {
    if (!loading) void SplashScreen.hideAsync();
  }, [loading]);

  if (loading) return null;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!signedIn ? (
        <Stack.Group>
          <Stack.Screen name="SignIn" component={SignInScreen} options={{ animationTypeForReplace: 'pop' }} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </Stack.Group>
      ) : (
        <Stack.Group>
          <Stack.Screen name="Tabs" component={TabNavigator} />
          <Stack.Screen name="Scan" component={ScanScreen} options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
          <Stack.Screen name="ReceiptReview" component={ReceiptReviewScreen} />
          <Stack.Screen name="Product" component={ProductScreen} />
          <Stack.Screen name="HomeItem" component={HomeItemScreen} />
          <Stack.Screen name="PackScan" component={PackScanScreen} options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
          <Stack.Screen name="TripDetail" component={TripDetailScreen} />
          <Stack.Screen name="Spending" component={SpendingScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="Household" component={HouseholdScreen} />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}
