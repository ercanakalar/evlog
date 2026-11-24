import { useTranslation } from 'react-i18next';
import { Button, Card, Row, Text } from '@/components/ui';
import { useFormatters } from '@/hooks/common/useFormatters';
import { useTheme } from '@/theme';
import type { Upkeep } from '@/types/api/models';

type Next = NonNullable<Upkeep['next']>;

export function NextTaskCard({
  task,
  onInvoice,
  onDone,
  completing,
}: {
  task: Next;
  onInvoice: () => void;
  onDone: () => void;
  completing: boolean;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const f = useFormatters();
  const late = task.daysLeft < 0;
  return (
    <Card tone="warm">
      <Row style={{ alignItems: 'baseline' }}>
        <Text variant="display">{Math.abs(task.daysLeft)}</Text>
        <Text variant="label" color={colors.warmText}>
          {late ? t('upkeep.daysLate') : t('upkeep.daysLeft')}
        </Text>
      </Row>
      <Text variant="heading">
        {task.appliance.name} · {task.title.toLocaleLowerCase()}
      </Text>
      <Text variant="caption" muted>
        {task.lastDoneAt ? `${t('upkeep.lastDone', { date: f.dateTime(task.lastDoneAt) })} ` : ''}
        {task.appliance.type === 'COMBI_BOILER'
          ? t('upkeep.boilerHint')
          : t('upkeep.repeats', { interval: f.interval(task.intervalDays) })}
      </Text>
      <Row style={{ marginTop: 6 }}>
        <Button title={t('upkeep.addInvoice')} style={{ flex: 1, minHeight: 42 }} onPress={onInvoice} />
        <Button
          title={t('upkeep.markDone')}
          variant="outline"
          style={{ flex: 1, minHeight: 42 }}
          loading={completing}
          onPress={onDone}
        />
      </Row>
    </Card>
  );
}
