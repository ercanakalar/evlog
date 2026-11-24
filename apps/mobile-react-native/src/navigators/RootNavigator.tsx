import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ErrorView } from '@/components/ui';
import { useCurrentHomeState } from '@/hooks/common/useCurrentHome';
import { useExpiryReminders } from '@/hooks/groceries/useExpiryReminders';
import { PackScanScreen } from '@/screens/groceries/packs/PackScanScreen';
import { ProductScreen } from '@/screens/groceries/product/ProductScreen';
import { ReceiptReviewScreen as GroceryReceiptScreen } from '@/screens/groceries/receipts/ReceiptReviewScreen';
import { ScanScreen } from '@/screens/groceries/scan/ScanScreen';
import { SettingsScreen as GrocerySettingsScreen } from '@/screens/groceries/settings/SettingsScreen';
import { HomeItemScreen } from '@/screens/groceries/shelf/HomeItemScreen';
import { SpendingScreen } from '@/screens/groceries/spending/SpendingScreen';
import { TripDetailScreen } from '@/screens/groceries/trips/TripDetailScreen';
import { ListingScreen } from '@/screens/listing/ListingScreen';
import { OnboardingScreen } from '@/screens/onboarding/OnboardingScreen';
import { SignInScreen } from '@/screens/profile/auth/SignInScreen';
import { SignUpScreen } from '@/screens/profile/auth/SignUpScreen';
import { LegalScreen } from '@/screens/profile/legal/LegalScreen';
import { ProfileScreen } from '@/screens/profile/ProfileScreen';
import { SettingsScreen } from '@/screens/profile/settings/SettingsScreen';
import { ReceiptListScreen } from '@/screens/receipts/ReceiptListScreen';
import { ReceiptReviewScreen } from '@/screens/receipts/ReceiptReviewScreen';
import { ConditionSessionScreen } from '@/screens/record/ConditionSessionScreen';
import { selectAuthStatus as selectGroceriesStatus } from '@/store/groceries/authSlice';
import { useAppSelector } from '@/store/hooks';
import { selectAuthStatus } from '@/store/slices/authSlice';
import type { RootStackParamList } from '@/types/screens/navigation';
import { HomeTabNavigator } from './HomeTabNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Which screens exist depends on the auth state and on whether the user has
 * a home yet; React Navigation moves to the right group when that changes.
 * Grocery screens also need the groceries (Raf) account.
 */
export function RootNavigator({ fontsReady }: { fontsReady: boolean }) {
  const status = useAppSelector(selectAuthStatus);
  const groceriesStatus = useAppSelector(selectGroceriesStatus);
  const { current, isLoading, error, refetch } = useCurrentHomeState();
  const signedIn = status === 'signedIn';
  const groceries = signedIn && groceriesStatus === 'signedIn';
  const loading = !fontsReady || status === 'restoring' || groceriesStatus === 'restoring' || (signedIn && isLoading);
  useExpiryReminders(groceries);

  useEffect(() => {
    if (!loading) void SplashScreen.hideAsync();
  }, [loading]);

  if (loading) return null;
  // Signed in, but /me failed (e.g. offline): offer a retry instead of onboarding.
  if (signedIn && !current && error) return <ErrorView error={error} onRetry={refetch} />;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!signedIn ? (
        <Stack.Group>
          <Stack.Screen name="SignIn" component={SignInScreen} options={{ animationTypeForReplace: 'pop' }} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
        </Stack.Group>
      ) : !current ? (
        <Stack.Group>
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
        </Stack.Group>
      ) : (
        <Stack.Group>
          <Stack.Screen name="HomeTabs" component={HomeTabNavigator} />
          <Stack.Screen name="ConditionSession" component={ConditionSessionScreen} />
          <Stack.Screen name="ReceiptReview" component={ReceiptReviewScreen} options={{ presentation: 'modal' }} />
          <Stack.Screen name="ReceiptList" component={ReceiptListScreen} />
          <Stack.Screen name="Listing" component={ListingScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
        </Stack.Group>
      )}
      {current && groceries ? (
        <Stack.Group navigationKey="groceries">
          <Stack.Screen name="GroceryScan" component={ScanScreen} options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
          <Stack.Screen name="GroceryReceipt" component={GroceryReceiptScreen} />
          <Stack.Screen name="GroceryProduct" component={ProductScreen} />
          <Stack.Screen name="GroceryHomeItem" component={HomeItemScreen} />
          <Stack.Screen
            name="GroceryPackScan"
            component={PackScanScreen}
            options={{ presentation: 'fullScreenModal', animation: 'fade' }}
          />
          <Stack.Screen name="GroceryTrip" component={TripDetailScreen} />
          <Stack.Screen name="GrocerySpending" component={SpendingScreen} />
          <Stack.Screen name="GrocerySettings" component={GrocerySettingsScreen} />
        </Stack.Group>
      ) : null}
      {/* Available in every state. */}
      <Stack.Group navigationKey={signedIn ? 'user' : 'guest'}>
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Legal" component={LegalScreen} />
      </Stack.Group>
    </Stack.Navigator>
  );
}
