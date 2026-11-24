import Feather from '@expo/vector-icons/Feather';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Badge, Row, Rule, SpaceBetween, Text } from '@/components/ui';
import { useFormatters } from '@/hooks/common/useFormatters';
import { useTheme } from '@/theme';
import type { Appliance } from '@/types/api/models';

export function ApplianceRow({ appliance, divider }: { appliance: Appliance; divider?: boolean }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const f = useFormatters();
  const task = appliance.tasks[0];
  const due = task
    ? task.daysLeft < 0
      ? { label: t('upkeep.lateBy', { count: -task.daysLeft }), tone: 'danger' as const }
      : { label: task.daysLeft <= 60 ? f.shortDate(task.nextDueAt) : f.monthYear(task.nextDueAt), tone: 'neutral' as const }
    : null;
  const paperwork = appliance.warrantyUntil
    ? t('upkeep.warrantyUntil', { date: f.monthYear(appliance.warrantyUntil) })
    : appliance.hasReceipt
      ? t('upkeep.receiptAttached')
      : t('upkeep.noReceipt');

  return (
    <View>
      {divider ? <Rule /> : null}
      <SpaceBetween style={{ paddingVertical: 10, gap: 10 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="label">{appliance.name}</Text>
          {task ? (
            <Text variant="caption" color={colors.textSoft}>
              {task.title} · {f.interval(task.intervalDays)}
            </Text>
          ) : null}
          <Row style={{ gap: 4 }}>
            <Feather name="file-text" size={11} color={colors.textMuted} />
            <Text variant="caption" muted>
              {paperwork}
            </Text>
          </Row>
        </View>
        {due ? <Badge label={due.label} tone={due.tone} /> : null}
      </SpaceBetween>
    </View>
  );
}
