import { useTranslation } from 'react-i18next';
import { Card, SpaceBetween, Text } from '@/components/ui';
import { useFormatters } from '@/hooks/common/useFormatters';
import type { ConditionSession } from '@/types/api/models';

export function ConfirmationStatus({ session }: { session: ConditionSession }) {
  const { t } = useTranslation();
  const f = useFormatters();
  const line = (at: string | null) => (at ? t('record.confirmedOn', { date: f.dateTime(at) }) : t('common.notYet'));
  return (
    <Card>
      <SpaceBetween>
        <Text>{t('common.owner')}</Text>
        <Text muted>{line(session.ownerConfirmedAt)}</Text>
      </SpaceBetween>
      <SpaceBetween>
        <Text>{t('common.tenant')}</Text>
        <Text muted>{session.tenancyId ? line(session.tenantConfirmedAt) : t('record.noTenant')}</Text>
      </SpaceBetween>
    </Card>
  );
}
