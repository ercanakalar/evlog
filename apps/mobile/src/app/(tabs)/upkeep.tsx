import Feather from '@expo/vector-icons/Feather';
import { Alert, View } from 'react-native';
import { useReceiptScanner } from '@/components/scan-receipt-button';
import { Badge, Button, Card, Empty, ErrorView, IconButton, Loading, Row, Screen, SectionHeader, T } from '@/components/ui';
import { every, longDate, monthYear, shortDate } from '@/lib/format';
import { useCurrentHome } from '@/lib/home-context';
import { useAddAppliance, useCompleteTask, useUpkeep } from '@/lib/queries';
import type { ApplianceType, MaintenanceTask } from '@/lib/types';
import { useTheme } from '@/theme/use-theme';

const APPLIANCES: { type: ApplianceType; name: string }[] = [
  { type: 'COMBI_BOILER', name: 'Combi boiler' },
  { type: 'DISHWASHER', name: 'Dishwasher' },
  { type: 'WASHING_MACHINE', name: 'Washing machine' },
  { type: 'AIR_CONDITIONER', name: 'Air conditioner' },
  { type: 'REFRIGERATOR', name: 'Refrigerator' },
];

const due = (task: MaintenanceTask) =>
  task.daysLeft < 0
    ? { label: `${-task.daysLeft} days late`, tone: 'danger' as const }
    : task.daysLeft <= 60
      ? { label: shortDate(task.nextDueAt), tone: 'neutral' as const }
      : { label: monthYear(task.nextDueAt), tone: 'neutral' as const };

export default function UpkeepScreen() {
  const { home } = useCurrentHome();
  const { colors } = useTheme();
  const upkeep = useUpkeep(home.id);
  const complete = useCompleteTask(home.id);
  const add = useAddAppliance(home.id);
  const scanner = useReceiptScanner(home.id);

  if (upkeep.isPending) return <Loading />;
  if (upkeep.isError) return <ErrorView error={upkeep.error} onRetry={() => void upkeep.refetch()} />;
  const { next, appliances } = upkeep.data;

  const addAppliance = () =>
    Alert.alert('Add appliance', 'A recommended maintenance schedule is created for you.', [
      ...APPLIANCES.map((a) => ({
        text: a.name,
        onPress: () => add.mutate(a, { onError: (e) => Alert.alert('Could not add', e.message) }),
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);

  const markDone = (task: MaintenanceTask) =>
    complete.mutate(task.id, { onError: (e) => Alert.alert('Could not update', e.message) });

  return (
    <Screen refreshing={upkeep.isRefetching} onRefresh={() => void upkeep.refetch()}>
      <Row style={{ justifyContent: 'space-between', marginTop: 12 }}>
        <T variant="title">Upkeep</T>
        <IconButton icon="plus" label="Add appliance" onPress={addAppliance} />
      </Row>

      {next ? (
        <Card tone="warm">
          <Row style={{ alignItems: 'baseline' }}>
            <T variant="display" color={colors.text}>
              {Math.abs(next.daysLeft)}
            </T>
            <T variant="label" color={colors.warmText}>
              {next.daysLeft < 0 ? 'days late' : 'days left'}
            </T>
          </Row>
          <T variant="heading">
            {next.appliance.name} · {next.title.toLowerCase()}
          </T>
          <T variant="caption" muted>
            {next.lastDoneAt ? `Last done ${longDate(next.lastDoneAt)}. ` : ''}
            {next.appliance.type === 'COMBI_BOILER'
              ? 'A serviced boiler also supports your heating-efficiency rating.'
              : `Repeats ${every(next.intervalDays)}.`}
          </T>
          <Row style={{ marginTop: 6 }}>
            <Button
              title="Add invoice"
              style={{ flex: 1, minHeight: 42 }}
              onPress={() => scanner.start('SERVICE')}
            />
            <Button
              title="Mark as done"
              variant="outline"
              style={{ flex: 1, minHeight: 42 }}
              loading={complete.isPending}
              onPress={() => markDone(next)}
            />
          </Row>
        </Card>
      ) : null}

      <SectionHeader title="All appliances" />
      <Card style={{ padding: 6, gap: 6 }}>
        {appliances.length === 0 ? <Empty text="Add your appliances to get reminders." /> : null}
        {appliances.map((a) => {
          const task = a.tasks[0];
          const status = task ? due(task) : null;
          return (
            <Card key={a.id} tone="muted" style={{ padding: 12 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <T variant="label">{a.name}</T>
                  {task ? (
                    <T variant="caption" color={colors.primary}>
                      {task.title} · {every(task.intervalDays)}
                    </T>
                  ) : null}
                  <Row style={{ gap: 4 }}>
                    <Feather name="file-text" size={11} color={colors.textMuted} />
                    <T variant="caption" muted>
                      {a.warrantyUntil
                        ? `Warranty until ${monthYear(a.warrantyUntil)}`
                        : a.hasReceipt
                          ? 'Receipt attached'
                          : 'No receipt yet'}
                    </T>
                  </Row>
                </View>
                {status ? <Badge label={status.label} tone={status.tone} /> : null}
              </Row>
            </Card>
          );
        })}
      </Card>
    </Screen>
  );
}
