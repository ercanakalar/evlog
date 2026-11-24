import { useTranslation } from 'react-i18next';
import { ConfirmationStatus } from '@/components/record/ConfirmationStatus';
import { PhotoGrid } from '@/components/record/PhotoGrid';
import { RoomPicker } from '@/components/record/RoomPicker';
import { Badge, Button, ErrorView, Loading, Screen, ScreenHeader, SectionHeader, Text } from '@/components/ui';
import { useFormatters } from '@/hooks/common/useFormatters';
import { useConditionSession } from '@/hooks/record/useConditionSession';
import type { RootScreenProps } from '@/types/screens/navigation';

export function ConditionSessionScreen({ route }: RootScreenProps<'ConditionSession'>) {
  const { t } = useTranslation();
  const f = useFormatters();
  const c = useConditionSession(route.params.sessionId);

  if (c.isLoading) return <Loading />;
  if (!c.session) return <ErrorView error={c.error} onRetry={c.refresh} />;
  const s = c.session;

  return (
    <Screen refreshing={c.isRefreshing} onRefresh={c.refresh}>
      <ScreenHeader
        back
        title={t(`record.type.${s.type}`)}
        action={
          <Badge
            label={t(`record.status.${s.status}`)}
            tone={s.status === 'CONFIRMED' ? 'success' : 'neutral'}
            icon={s.status === 'OPEN' ? undefined : s.status === 'CONFIRMED' ? 'check' : 'lock'}
          />
        }
      />
      <Text variant="caption" muted>
        {t('record.started', { date: f.dateTime(s.startedAt) })}
        {s.lockedAt ? ` · ${t('record.locked', { date: f.dateTime(s.lockedAt) })}` : ''}
      </Text>
      {s.contentHash ? (
        <Text variant="caption" muted numberOfLines={1}>
          {t('record.fingerprint', { hash: s.contentHash.slice(0, 16) })}
        </Text>
      ) : null}

      {s.status === 'OPEN' ? (
        <>
          <SectionHeader title={t('record.room')} />
          <RoomPicker value={c.room} counts={s.rooms} onChange={c.setRoom} />
          <Button
            title={t('record.photograph', { room: t(`rooms.${c.room}`) })}
            icon="camera"
            loading={c.uploading}
            onPress={() => void c.takePhoto()}
          />
        </>
      ) : null}

      <SectionHeader title={t('record.photosTitle', { count: s.photos.length })} />
      <PhotoGrid photos={s.photos} />
      <ConfirmationStatus session={s} />

      {s.status === 'OPEN' ? (
        <Button title={t('record.lock')} icon="lock" disabled={!c.canLock} loading={c.acting} onPress={c.lock} />
      ) : null}
      {c.canConfirm ? (
        <Button title={t('record.confirm')} icon="check" loading={c.acting} onPress={() => void c.confirm()} />
      ) : null}
    </Screen>
  );
}
