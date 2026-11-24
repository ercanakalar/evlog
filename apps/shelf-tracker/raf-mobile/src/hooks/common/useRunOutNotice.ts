import { useTranslation } from 'react-i18next';
import { useModal } from '@/components/ui';
import type { AddedToList } from '@/types/api/models';

/** "Added to Weekend shop — Ran out at home: Kefir." when something ran out and went on a list. */
export function useRunOutNotice() {
  const { t } = useTranslation();
  const modal = useModal();
  return (list: AddedToList | null | undefined) => {
    if (list) modal.alert(t('lists.addedTo', { list: list.name }), t('lists.ranOut', { names: list.added.join(', ') }));
  };
}
