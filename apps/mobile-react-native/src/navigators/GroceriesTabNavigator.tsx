import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { ScreenTopInsetContext } from '@/components/ui';
import { SignInScreen } from '@/screens/groceries/auth/SignInScreen';
import { HomeScreen } from '@/screens/groceries/home/HomeScreen';
import { ListsScreen } from '@/screens/groceries/lists/ListsScreen';
import { ShelfScreen } from '@/screens/groceries/shelf/ShelfScreen';
import { TripsScreen } from '@/screens/groceries/trips/TripsScreen';
import { selectAuthStatus } from '@/store/groceries/authSlice';
import { useAppSelector } from '@/store/hooks';
import type { GroceriesTabParamList } from '@/types/screens/navigation';
import { GroceriesTabBar } from './GroceriesTabBar';

const Tab = createBottomTabNavigator<GroceriesTabParamList>();

/**
 * The Groceries tab. It uses its own (Raf) account: until that is connected
 * the tab shows the sign-in screen, then Overview · Shelf · Lists · Trips.
 */
export function GroceriesTabNavigator() {
  const { t } = useTranslation('groceries');
  const signedIn = useAppSelector(selectAuthStatus) === 'signedIn';

  if (!signedIn) return <SignInScreen />;
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false, tabBarPosition: 'top', animation: 'shift' }}
      tabBar={(props) => <GroceriesTabBar {...props} />}
      screenLayout={({ children }) => <ScreenTopInsetContext value={false}>{children}</ScreenTopInsetContext>}>
      <Tab.Screen name="GroceryHome" component={HomeScreen} options={{ title: t('tabs.home') }} />
      <Tab.Screen name="GroceryShelf" component={ShelfScreen} options={{ title: t('tabs.shelf') }} />
      <Tab.Screen name="GroceryLists" component={ListsScreen} options={{ title: t('tabs.lists') }} />
      <Tab.Screen name="GroceryTrips" component={TripsScreen} options={{ title: t('tabs.trips') }} />
    </Tab.Navigator>
  );
}
