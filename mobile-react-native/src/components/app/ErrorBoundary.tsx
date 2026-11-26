import { Component, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import i18n from '@/i18n';

/**
 * Last resort when a screen throws while rendering: says so and starts over,
 * instead of closing the app. Uses plain components, since the theme may be
 * what failed.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <View style={styles.page}>
        <Text style={styles.text}>{i18n.t('common.crashed')}</Text>
        <Pressable accessibilityRole="button" onPress={() => this.setState({ failed: false })} style={styles.button}>
          <Text style={styles.buttonText}>{i18n.t('common.retry')}</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  page: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16, backgroundColor: '#F2F3EF' },
  text: { fontSize: 16, color: '#15181A', textAlign: 'center' },
  button: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 24, borderRadius: 12, backgroundColor: '#15181A' },
  buttonText: { fontSize: 15, fontWeight: '600', color: '#FCFCFA' },
});
