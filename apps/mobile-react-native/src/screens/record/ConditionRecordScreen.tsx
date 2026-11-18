import { useTranslation } from 'react-i18next';
import { SessionCard } from '@/components/record/SessionCard';
import { Button, Empty, ErrorView, Loading, Screen, ScreenHeader, Text } from '@/components/ui';
import { useConditionRecords } from '@/hooks/record/useConditionRecords';

export function ConditionRecordScreen() {
  const { t } = useTranslation();
  const r = useConditionRecords();

  if (r.isLoading) return <Loading />;
  if (!r.sessions) return <ErrorView error={r.error} onRetry={r.refresh} />;

  return (
    <Screen withTabBar refreshing={r.isRefreshing} onRefresh={r.refresh}>
      <ScreenHeader title={t('record.title')} />
      <Text muted>{t('record.intro')}</Text>
      {r.sessions.length === 0 ? <Empty text={t('record.empty')} /> : null}
      {r.sessions.map((s) => (
        <SessionCard key={s.id} session={s} onPress={() => r.open(s.id)} />
      ))}
      {r.openSession ? (
        <Button title={t('record.continue')} icon="arrow-right" onPress={() => r.open(r.openSession!.id)} />
      ) : (
        <Button title={t('record.startNew')} icon="arrow-right" loading={r.starting} onPress={r.startNew} />
      )}
    </Screen>
  );
}
