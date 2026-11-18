import Feather from '@expo/vector-icons/Feather';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { HomeScreen } from '@/screens/home/HomeScreen';
import { KitchenScreen } from '@/screens/kitchen/KitchenScreen';
import { RatingsScreen } from '@/screens/ratings/RatingsScreen';
import { ConditionRecordScreen } from '@/screens/record/ConditionRecordScreen';
import { UpkeepScreen } from '@/screens/upkeep/UpkeepScreen';
import { useTheme } from '@/theme';
import type { IconName } from '@/types/components/ui';
import type { HomeTabParamList } from '@/types/screens/navigation';

const Tab = createBottomTabNavigator<HomeTabParamList>();

const ICONS: Record<keyof HomeTabParamList, IconName> = {
  Home: 'home',
  Record: 'camera',
  Ratings: 'star',
  Kitchen: 'shopping-bag',
  Upkeep: 'tool',
};

/** The five tabs, in the floating pill bar from the mockups. */
export function HomeTabNavigator() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: {
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: 20,
          height: 64,
          paddingTop: 6,
          paddingBottom: 6,
          borderRadius: 24,
          borderTopWidth: 0,
          backgroundColor: colors.card,
          elevation: 8,
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
        },
        tabBarIcon: ({ focused, color }) => (
          <View
            style={{
              paddingHorizontal: 14,
              paddingVertical: 3,
              borderRadius: 999,
              backgroundColor: focused ? colors.primarySoft : 'transparent',
            }}>
            <Feather name={ICONS[route.name]} size={18} color={color} />
          </View>
        ),
      })}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: t('tabs.home') }} />
      <Tab.Screen name="Record" component={ConditionRecordScreen} options={{ title: t('tabs.record') }} />
      <Tab.Screen name="Ratings" component={RatingsScreen} options={{ title: t('tabs.ratings') }} />
      <Tab.Screen name="Kitchen" component={KitchenScreen} options={{ title: t('tabs.kitchen') }} />
      <Tab.Screen name="Upkeep" component={UpkeepScreen} options={{ title: t('tabs.upkeep') }} />
    </Tab.Navigator>
  );
}
