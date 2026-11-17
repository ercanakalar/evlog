import { router } from 'expo-router';
import { Alert, View } from 'react-native';
import { Badge, Button, Card, ErrorView, Loading, Row, Screen, T } from '@/components/ui';
import { longDate, ROOM_LABEL, shortDate } from '@/lib/format';
import { useCurrentHome } from '@/lib/home-context';
import { useSessions, useStartSession } from '@/lib/queries';
import type { ConditionSession, ConditionSessionType } from '@/lib/types';
import { radius } from '@/theme/colors';
import { useTheme } from '@/theme/use-theme';

const TYPE_LABEL: Record<ConditionSessionType, string> = {
  MOVE_IN: 'Move-in',
  MOVE_OUT: 'Move-out',
  PERIODIC: 'Periodic check',
};

export default function RecordScreen() {
  const { home } = useCurrentHome();
  const sessions = useSessions(home.id);
  const start = useStartSession(home.id);

  if (sessions.isPending) return <Loading />;
  if (sessions.isError) return <ErrorView error={sessions.error} onRetry={() => void sessions.refetch()} />;
  const open = sessions.data.find((s) => s.status === 'OPEN');

  const startSession = () =>
    Alert.alert('New photo session', 'What is this record for?', [
      ...(['MOVE_IN', 'MOVE_OUT', 'PERIODIC'] as const).map((type) => ({
        text: TYPE_LABEL[type],
        onPress: () =>
          start.mutate(type, {
            onSuccess: (s) => router.push({ pathname: '/condition/[id]', params: { id: s.id } }),
            onError: (e) => Alert.alert('Could not start', e.message),
          }),
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);

  return (
    <Screen refreshing={sessions.isRefetching} onRefresh={() => void sessions.refetch()}>
      <T variant="title" style={{ marginTop: 12 }}>
        Condition record
      </T>
      <T muted>
        A verification, not a contract. Photos are time-stamped and locked, so owner and tenant agree on how the home
        looked.
      </T>

      {sessions.data.length === 0 ? <T muted>No records yet.</T> : null}
      {sessions.data.map((s) => (
        <SessionCard key={s.id} session={s} />
      ))}

      {open ? (
        <Button
          title="Continue photo session"
          icon="arrow-right"
          onPress={() => router.push({ pathname: '/condition/[id]', params: { id: open.id } })}
        />
      ) : (
        <Button title="Start new photo session" icon="arrow-right" loading={start.isPending} onPress={startSession} />
      )}
    </Screen>
  );
}

function SessionCard({ session }: { session: ConditionSession }) {
  const { colors } = useTheme();
  const rooms = Object.entries(session.rooms);
  return (
    <Card onPress={() => router.push({ pathname: '/condition/[id]', params: { id: session.id } })}>
      <Row style={{ justifyContent: 'space-between' }}>
        <View>
          <T variant="heading">{TYPE_LABEL[session.type]}</T>
          <T variant="caption" muted>
            {longDate(session.startedAt)}
          </T>
        </View>
        <Badge
          label={session.status === 'CONFIRMED' ? 'Confirmed' : session.status === 'LOCKED' ? 'Locked' : 'Open'}
          tone={session.status === 'CONFIRMED' ? 'success' : 'neutral'}
          icon={session.status === 'CONFIRMED' ? 'check' : session.status === 'LOCKED' ? 'lock' : undefined}
        />
      </Row>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {rooms.map(([room, count]) => (
          <View
            key={room}
            style={{
              width: '31.5%',
              aspectRatio: 1.25,
              borderRadius: radius.sm,
              backgroundColor: colors.cardMuted,
              justifyContent: 'flex-end',
              padding: 8,
            }}>
            <T variant="caption" style={{ fontWeight: '700' }}>
              {ROOM_LABEL[room]}
            </T>
            <T variant="caption" muted>
              {count} photos
            </T>
          </View>
        ))}
      </View>
      <Row style={{ justifyContent: 'space-between' }}>
        <T variant="caption" muted>
          Owner · {shortDate(session.ownerConfirmedAt)}
        </T>
        <T variant="caption" muted>
          Tenant · {session.tenancyId ? shortDate(session.tenantConfirmedAt) : 'n/a'}
        </T>
      </Row>
    </Card>
  );
}
