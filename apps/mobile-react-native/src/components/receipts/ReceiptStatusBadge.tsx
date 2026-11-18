import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui';
import type { ReceiptStatus } from '@/types/api/models';

export function ReceiptStatusBadge({ status }: { status: ReceiptStatus }) {
  const { t } = useTranslation();
  return (
    <Badge
      label={t(`receipts.status.${status}`)}
      tone={status === 'CONFIRMED' ? 'success' : status === 'FAILED' ? 'danger' : 'neutral'}
      icon={status === 'CONFIRMED' ? 'check' : undefined}
    />
  );
}
