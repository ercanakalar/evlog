import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import { asAppError, describeError } from '@/store/bases/errorMapping';

/** Shows a native alert with a translated title and the API's message. */
export function useErrorAlert() {
  const { t } = useTranslation();
  return useCallback(
    (title: string, error: unknown) => Alert.alert(title, describeError(asAppError(error), t)),
    [t],
  );
}
