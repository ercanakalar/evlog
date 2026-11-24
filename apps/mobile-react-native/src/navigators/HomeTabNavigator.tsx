import Feather from '@expo/vector-icons/Feather';
import { createBottomTabNavigator, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui';
import { env } from '@/config/env';
import { TAB_BAR_HEIGHT } from '@/constants/layout';
import { HomeScreen } from '@/screens/home/HomeScreen';
import { RatingsScreen } from '@/screens/ratings/RatingsScreen';
import { ConditionRecordScreen } from '@/screens/record/ConditionRecordScreen';
import { UpkeepScreen } from '@/screens/upkeep/UpkeepScreen';
import { useTheme } from '@/theme';
import type { IconName } from '@/types/components/ui';
import type { HomeTabParamList } from '@/types/screens/navigation';
import { GroceriesTabNavigator } from './GroceriesTabNavigator';

const Tab = createBottomTabNavigator<HomeTabParamList>();

const ICONS: Record<keyof HomeTabParamList, IconName> = {
  Home: 'home',
  Record: 'camera',
  Ratings: 'star',
  Groceries: 'shopping-bag',
  Upkeep: 'tool',
};

/** The dark bar: the active tab gets the highlighter, in both themes. */
function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors, fonts } = useTheme();
  const bar = '#15181A';
  return (
    <View
      accessibilityRole="tablist"
      style={[styles.bar, { backgroundColor: bar, height: TAB_BAR_HEIGHT + insets.bottom, paddingBottom: insets.bottom }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const name = route.name as keyof HomeTabParamList;
        const label = descriptors[route.key]?.options.title ?? name;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={label}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
            }}
            style={styles.tab}>
            <View style={[styles.icon, { backgroundColor: focused ? colors.accent : 'transparent' }]}>
              <Feather name={ICONS[name]} size={19} color={focused ? colors.onAccent : '#C4C8C3'} />
            </View>
            <Text
              variant="caption"
              color={focused ? '#FCFCFA' : '#C4C8C3'}
              numberOfLines={1}
              style={{ fontFamily: focused ? fonts.bodySemiBold : fonts.bodyMedium }}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Home · Record · Ratings · Groceries · Upkeep. Groceries is left out when no Raf API is configured. */
export function HomeTabNavigator() {
  const { t } = useTranslation();
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: t('tabs.home') }} />
      <Tab.Screen name="Record" component={ConditionRecordScreen} options={{ title: t('tabs.record') }} />
      <Tab.Screen name="Ratings" component={RatingsScreen} options={{ title: t('tabs.ratings') }} />
      {env.groceriesEnabled ? (
        <Tab.Screen name="Groceries" component={GroceriesTabNavigator} options={{ title: t('tabs.groceries') }} />
      ) : null}
      <Tab.Screen name="Upkeep" component={UpkeepScreen} options={{ title: t('tabs.upkeep') }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingTop: 6 },
  tab: { flex: 1, height: 54, alignItems: 'center', justifyContent: 'center', gap: 3 },
  icon: { width: 48, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
