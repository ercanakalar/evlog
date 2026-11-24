import Feather from '@expo/vector-icons/Feather';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { space } from '@/constants/layout';
import { asAppError, describeError } from '@/store/bases/errorMapping';
import { useTheme } from '@/theme';
import type { IconName } from '@/types/components/ui';
import { Button } from './Button';
import { Text } from './Text';

export function Loading() {
  const { colors } = useTheme();
  return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      <ActivityIndicator color={colors.text} />
    </View>
  );
}

export function ErrorView({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View style={[styles.center, { gap: space.md, backgroundColor: colors.background }]}>
      <Text muted style={{ textAlign: 'center' }}>
        {(error ? describeError(asAppError(error), t) : '') || t('common.somethingWrong')}
      </Text>
      {onRetry ? <Button title={t('common.retry')} variant="outline" onPress={onRetry} /> : null}
    </View>
  );
}

/** Nothing to show yet. With an icon it becomes a centred card that explains what will appear here. */
export function Empty({ text, icon }: { text: string; icon?: IconName }) {
  const { colors } = useTheme();
  if (!icon) {
    return (
      <Text variant="small" muted style={{ textAlign: 'center', paddingVertical: space.lg }}>
        {text}
      </Text>
    );
  }
  return (
    <View style={[styles.empty, { backgroundColor: colors.card }]}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.accent }]}>
        <Feather name={icon} size={22} color={colors.onAccent} />
      </View>
      <Text variant="small" muted style={{ textAlign: 'center' }}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  empty: { alignItems: 'center', gap: space.md, paddingVertical: space.xl, paddingHorizontal: space.xl, borderRadius: 10 },
  emptyIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
});
