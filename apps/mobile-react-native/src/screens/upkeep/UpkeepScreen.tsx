import { useTranslation } from 'react-i18next';
import { ApplianceRow } from '@/components/upkeep/ApplianceRow';
import { NextTaskCard } from '@/components/upkeep/NextTaskCard';
import { Card, Empty, ErrorView, IconButton, Loading, Screen, ScreenHeader, SectionHeader } from '@/components/ui';
import { useUpkeep } from '@/hooks/upkeep/useUpkeep';

export function UpkeepScreen() {
  const { t } = useTranslation();
  const u = useUpkeep();

  if (u.isLoading) return <Loading />;
  if (u.error && u.appliances.length === 0) return <ErrorView error={u.error} onRetry={u.refresh} />;

  return (
    <Screen refreshing={u.isRefreshing} onRefresh={u.refresh}>
      <ScreenHeader
        title={t('upkeep.title')}
        action={<IconButton icon="plus" label={t('upkeep.add')} onPress={u.promptAddAppliance} />}
      />
      {u.next ? (
        <NextTaskCard
          task={u.next}
          completing={u.completing}
          onInvoice={u.addInvoice}
          onDone={() => void u.markDone(u.next!.id)}
        />
      ) : null}
      <SectionHeader title={t('upkeep.all')} />
      {u.appliances.length === 0 ? (
        <Empty icon="tool" text={t('upkeep.empty')} />
      ) : (
        <Card style={{ paddingVertical: 2, gap: 0 }}>
          {u.appliances.map((a, i) => (
            <ApplianceRow key={a.id} appliance={a} divider={i > 0} />
          ))}
        </Card>
      )}
    </Screen>
  );
}
