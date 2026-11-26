import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { HomeScreen } from '@/screens/home/HomeScreen';
import { ListsScreen } from '@/screens/lists/ListsScreen';
import { ShelfScreen } from '@/screens/shelf/ShelfScreen';
import { TripsScreen } from '@/screens/trips/TripsScreen';
import type { TabParamList } from '@/types/screens/navigation';
import { TabBar } from './TabBar';

const Tab = createBottomTabNavigator<TabParamList>();

/** Home · Shelf · [Scan] · Lists · Trips */
export function TabNavigator() {
  const { t } = useTranslation();
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: t('tabs.home') }} />
      <Tab.Screen name="Shelf" component={ShelfScreen} options={{ title: t('tabs.shelf') }} />
      <Tab.Screen name="Lists" component={ListsScreen} options={{ title: t('tabs.lists') }} />
      <Tab.Screen name="Trips" component={TripsScreen} options={{ title: t('tabs.trips') }} />
    </Tab.Navigator>
  );
}
