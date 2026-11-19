import Feather from '@expo/vector-icons/Feather';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui';
import { TAB_BAR_HEIGHT } from '@/constants/layout';
import { useTheme } from '@/theme';
import type { IconName } from '@/types/components/ui';
import type { TabParamList } from '@/types/screens/navigation';

const ICONS: Record<keyof TabParamList, IconName> = {
  Home: 'home',
  Shelf: 'columns',
  Lists: 'check-square',
  Trips: 'file-text',
};

/**
 * The dark bar from the mockups: four tabs with the lime scan button in the
 * middle. Scan is not a tab; it opens the scanner over everything.
 */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  // The bar stays ink in both themes, like the mockups.
  const { colors, fonts } = useTheme();
  const bar = '#15181A';

  const tab = (index: number) => {
    const route = state.routes[index];
    if (!route) return null;
    const focused = state.index === index;
    const name = route.name as keyof TabParamList;
    const label = descriptors[route.key]?.options.title ?? name;
    const color = focused ? colors.accent : '#C4C8C3';
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
        <Feather name={ICONS[name]} size={22} color={color} />
        <Text variant="caption" color={color} style={{ fontFamily: focused ? fonts.bodySemiBold : fonts.bodyMedium }}>
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View
      accessibilityRole="tablist"
      style={[styles.bar, { backgroundColor: bar, height: TAB_BAR_HEIGHT + insets.bottom, paddingBottom: insets.bottom }]}>
      {tab(0)}
      {tab(1)}
      <View style={styles.tab}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('scan.open')}
          onPress={() => navigation.getParent()?.navigate('Scan')}
          style={({ pressed }) => [styles.scan, { backgroundColor: colors.accent, opacity: pressed ? 0.85 : 1 }]}>
          <Feather name="maximize" size={26} color={colors.onAccent} />
        </Pressable>
      </View>
      {tab(2)}
      {tab(3)}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingTop: 6 },
  tab: { flex: 1, height: 56, alignItems: 'center', justifyContent: 'center', gap: 4 },
  scan: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
