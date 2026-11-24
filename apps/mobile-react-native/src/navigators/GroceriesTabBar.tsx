import Feather from '@expo/vector-icons/Feather';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui';
import { HIT, radius, space } from '@/constants/layout';
import { useTheme } from '@/theme';

/**
 * The Groceries sub-bar under the status bar: Overview · Shelf · Lists · Trips
 * as pills, and the highlighter scan button that opens the camera over everything.
 */
export function GroceriesTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { t } = useTranslation('groceries');
  const { colors } = useTheme();

  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: colors.background }}>
      <View style={styles.bar}>
        <ScrollView
          horizontal
          accessibilityRole="tablist"
          showsHorizontalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={styles.pills}>
          {state.routes.map((route, index) => {
            const focused = state.index === index;
            const label = descriptors[route.key]?.options.title ?? route.name;
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
                style={({ pressed }) => [
                  styles.pill,
                  { backgroundColor: focused ? colors.ink : colors.cardMuted, opacity: pressed ? 0.8 : 1 },
                ]}>
                <Text variant="label" color={focused ? colors.onInk : colors.text} style={{ fontSize: 13.5 }}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('scan.open')}
          onPress={() => navigation.getParent()?.getParent()?.navigate('GroceryScan')}
          style={({ pressed }) => [styles.scan, { backgroundColor: colors.accent, opacity: pressed ? 0.85 : 1 }]}>
          <Feather name="maximize" size={20} color={colors.onAccent} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingRight: space.xl, paddingTop: space.xs },
  pills: { paddingLeft: space.xl, paddingRight: space.xs, gap: 6, alignItems: 'center' },
  pill: { height: 36, paddingHorizontal: 14, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  scan: { width: HIT, height: HIT, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
});
