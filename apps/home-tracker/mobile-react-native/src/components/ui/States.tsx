import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { space } from '@/constants/layout';
import { asAppError, describeError } from '@/store/bases/errorMapping';
import { useTheme } from '@/theme';
import { Button } from './Button';
import { Text } from './Text';

export function Loading() {
  const { colors } = useTheme();
  return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      <ActivityIndicator color={colors.primary} />
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

export function Empty({ text }: { text: string }) {
  return (
    <Text muted style={{ textAlign: 'center', paddingVertical: space.lg }}>
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl },
});
