import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { space } from '@/constants/layout';
import { useTheme } from '@/theme';
import type { ScreenProps } from '@/types/components/ui';

/**
 * Scrolling page on the pale ground. `header` stays put above the scroll
 * (titles, filters); `footer` is pinned to the bottom (save bars, totals).
 */
export function Screen({ children, header, footer, refreshing, onRefresh, gap = space.md + 2 }: ScreenProps) {
  const { colors } = useTheme();
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
      {header ? <View style={styles.header}>{header}</View> : null}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { gap }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={refreshing ?? false} onRefresh={onRefresh} tintColor={colors.text} />
          ) : undefined
        }>
        {children}
      </ScrollView>
      {footer}
    </SafeAreaView>
  );
}

/**
 * Pinned white bar at the bottom of a screen ("Save receipt", list total).
 * Above the tab bar, pass `inset={false}`: the tab bar already clears the home indicator.
 */
export function FooterBar({ children, inset = true }: { children: ReactNode; inset?: boolean }) {
  const { colors } = useTheme();
  return (
    <SafeAreaView
      edges={inset ? ['bottom'] : []}
      style={{ backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border }}>
      <View style={styles.footer}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.sm + 2, gap: space.md },
  content: { paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.xl },
  footer: { paddingHorizontal: space.xl, paddingTop: space.md, paddingBottom: space.md, gap: space.sm + 2 },
});
