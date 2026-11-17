import Feather from '@expo/vector-icons/Feather';
import { Tabs } from 'expo-router/js-tabs';
import { View } from 'react-native';
import type { IconName } from '@/components/ui';
import { useTheme } from '@/theme/use-theme';

const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: 'index', title: 'Home', icon: 'home' },
  { name: 'record', title: 'Record', icon: 'camera' },
  { name: 'ratings', title: 'Ratings', icon: 'star' },
  { name: 'kitchen', title: 'Kitchen', icon: 'shopping-bag' },
  { name: 'upkeep', title: 'Upkeep', icon: 'tool' },
];

/** Floating pill tab bar from the mockups. */
export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
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
      }}>
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused, color }) => (
              <View
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 3,
                  borderRadius: 999,
                  backgroundColor: focused ? colors.primarySoft : 'transparent',
                }}>
                <Feather name={tab.icon} size={18} color={color as string} />
              </View>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
