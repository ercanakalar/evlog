import Feather from '@expo/vector-icons/Feather';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';
import { Text } from '@/components/ui';
import { space } from '@/constants/layout';
import { useTheme } from '@/theme';
import type { ReportTarget } from '@/types/api/models';

/** Small "Report" link under content someone else made. */
export function ReportLink({ targetType, targetId }: { targetType: ReportTarget; targetId: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const navigation = useNavigation();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('report.open')}
      hitSlop={8}
      onPress={() => navigation.navigate('Report', { targetType, targetId })}
      style={({ pressed }) => ({
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.xs,
        opacity: pressed ? 0.6 : 1,
      })}>
      <Feather name="flag" size={12} color={colors.textMuted} />
      <Text variant="caption" muted>
        {t('report.open')}
      </Text>
    </Pressable>
  );
}
