import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useModal } from '@/components/ui';
import { asAppError, describeError } from '@/store/bases/errorMapping';

/** Shows the app modal with a translated title and the API's message. */
export function useErrorAlert() {
  const { t } = useTranslation();
  const modal = useModal();
  return useCallback(
    (title: string, error: unknown) => modal.alert(title, describeError(asAppError(error), t)),
    [t, modal],
  );
}
