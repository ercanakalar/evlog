import Feather from '@expo/vector-icons/Feather';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Badge, Card, Row, SpaceBetween, Text } from '@/components/ui';
import { useFormatters } from '@/hooks/common/useFormatters';
import { useTheme } from '@/theme';
import type { Appliance } from '@/types/api/models';

export function ApplianceRow({ appliance }: { appliance: Appliance }) {
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
    <Card tone="muted" style={{ padding: 12 }}>
      <SpaceBetween>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="label">{appliance.name}</Text>
          {task ? (
            <Text variant="caption" color={colors.primary}>
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
    </Card>
  );
}
