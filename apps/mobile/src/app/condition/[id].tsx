import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';
import { Badge, Button, Card, Chip, ErrorView, IconButton, Loading, Row, Screen, SectionHeader, T } from '@/components/ui';
import { authedImage } from '@/lib/api';
import { captureImage } from '@/lib/images';
import { longDate, ROOM_LABEL } from '@/lib/format';
import { useCurrentHome } from '@/lib/home-context';
import { useAddPhoto, useSession, useSessionAction } from '@/lib/queries';
import type { Room } from '@/lib/types';
import { radius } from '@/theme/colors';
import { useTheme } from '@/theme/use-theme';

const ROOMS = Object.keys(ROOM_LABEL) as Room[];

export default function ConditionSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { home, role } = useCurrentHome();
  const { colors } = useTheme();
  const session = useSession(id);
  const addPhoto = useAddPhoto(id);
  const action = useSessionAction(id, home.id);
  const [room, setRoom] = useState<Room>('LIVING_ROOM');

  if (session.isPending) return <Loading />;
  if (session.isError) return <ErrorView error={session.error} onRetry={() => void session.refetch()} />;
  const s = session.data;
  const myConfirmation = role === 'OWNER' ? s.ownerConfirmedAt : s.tenantConfirmedAt;

  const takePhoto = async () => {
    try {
      const file = await captureImage('camera');
      if (file) await addPhoto.mutateAsync({ file, room });
    } catch (error) {
      Alert.alert('Photo not saved', error instanceof Error ? error.message : undefined);
    }
  };

  const lock = () =>
    Alert.alert('Lock this record?', 'Photos cannot be added or removed afterwards.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Lock', onPress: () => action.mutate('lock', { onError: (e) => Alert.alert('Could not lock', e.message) }) },
    ]);

  return (
    <Screen refreshing={session.isRefetching} onRefresh={() => void session.refetch()}>
      <Row style={{ marginTop: 8 }}>
        <IconButton icon="chevron-left" tone="card" label="Back" onPress={() => router.back()} />
      </Row>
      <Row style={{ justifyContent: 'space-between' }}>
        <T variant="title">{s.type === 'MOVE_IN' ? 'Move-in' : s.type === 'MOVE_OUT' ? 'Move-out' : 'Check'}</T>
        <Badge
          label={s.status}
          tone={s.status === 'CONFIRMED' ? 'success' : 'neutral'}
          icon={s.status === 'OPEN' ? undefined : s.status === 'CONFIRMED' ? 'check' : 'lock'}
        />
      </Row>
      <T variant="caption" muted>
        Started {longDate(s.startedAt)}
        {s.lockedAt ? ` · locked ${longDate(s.lockedAt)}` : ''}
      </T>
      {s.contentHash ? (
        <T variant="caption" muted numberOfLines={1}>
          Fingerprint {s.contentHash.slice(0, 16)}…
        </T>
      ) : null}

      {s.status === 'OPEN' ? (
        <>
          <SectionHeader title="Room" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {ROOMS.map((r) => (
              <Chip key={r} label={`${ROOM_LABEL[r]}${s.rooms[r] ? ` · ${s.rooms[r]}` : ''}`} selected={r === room} onPress={() => setRoom(r)} />
            ))}
          </View>
          <Button title={`Photograph ${ROOM_LABEL[room].toLowerCase()}`} icon="camera" loading={addPhoto.isPending} onPress={() => void takePhoto()} />
        </>
      ) : null}

      <SectionHeader title={`Photos (${s.photos.length})`} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {s.photos.map((p) => (
          <View key={p.id} style={{ width: '31.5%', gap: 2 }}>
            <Image
              source={authedImage(`/condition-photos/${p.id}/file`)}
              style={{ width: '100%', aspectRatio: 1, borderRadius: radius.sm, backgroundColor: colors.cardMuted }}
              contentFit="cover"
            />
            <T variant="caption" muted numberOfLines={1}>
              {ROOM_LABEL[p.room]}
            </T>
          </View>
        ))}
      </View>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <T>Owner</T>
          <T muted>{s.ownerConfirmedAt ? `Confirmed ${longDate(s.ownerConfirmedAt)}` : 'Not yet'}</T>
        </Row>
        <Row style={{ justifyContent: 'space-between' }}>
          <T>Tenant</T>
          <T muted>
            {!s.tenancyId ? 'No tenant' : s.tenantConfirmedAt ? `Confirmed ${longDate(s.tenantConfirmedAt)}` : 'Not yet'}
          </T>
        </Row>
      </Card>

      {s.status === 'OPEN' ? (
        <Button title="Lock and confirm" icon="lock" disabled={s.photos.length === 0} loading={action.isPending} onPress={lock} />
      ) : null}
      {s.status === 'LOCKED' && !myConfirmation ? (
        <Button
          title="I confirm these photos"
          icon="check"
          loading={action.isPending}
          onPress={() => action.mutate('confirm', { onError: (e) => Alert.alert('Could not confirm', e.message) })}
        />
      ) : null}
    </Screen>
  );
}
