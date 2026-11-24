import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useModal } from '@/components/ui';
import { QUICK_ADD_APPLIANCES } from '@/constants/domain';
import { applianceSelectors } from '@/store/adapters/applianceAdapter';
import {
  useAddApplianceMutation,
  useCompleteTaskMutation,
  useGetUpkeepQuery,
} from '@/store/services/upkeepService';
import { useCurrentHome } from '../common/useCurrentHome';
import { useErrorAlert } from '../common/useErrorAlert';
import { useReceiptScanner } from '../receipts/useReceiptScanner';

export function useUpkeep() {
  const { t } = useTranslation();
  const showError = useErrorAlert();
  const modal = useModal();
  const { home } = useCurrentHome();
  const upkeep = useGetUpkeepQuery(home.id);
  const [addAppliance] = useAddApplianceMutation();
  const [completeTask, { isLoading: completing }] = useCompleteTaskMutation();
  const scanner = useReceiptScanner(home.id);

  const appliances = useMemo(
    () => (upkeep.data ? applianceSelectors.selectAll(upkeep.data.appliances) : []),
    [upkeep.data],
  );

  const promptAddAppliance = () =>
    modal.choose({
      title: t('upkeep.add'),
      message: t('upkeep.addBody'),
      choices: QUICK_ADD_APPLIANCES.map((type) => ({
        label: t(`upkeep.appliance.${type}`),
        onPress: () =>
          void addAppliance({ homeId: home.id, type, name: t(`upkeep.appliance.${type}`) })
            .unwrap()
            .catch((error: unknown) => showError(t('upkeep.addFailed'), error)),
      })),
    });

  const markDone = (taskId: string) =>
    completeTask({ homeId: home.id, taskId })
      .unwrap()
      .catch((error: unknown) => showError(t('upkeep.updateFailed'), error));

  return {
    next: upkeep.data?.next ?? null,
    appliances,
    isLoading: upkeep.isLoading,
    isRefreshing: upkeep.isFetching && !upkeep.isLoading,
    error: upkeep.error,
    refresh: upkeep.refetch,
    promptAddAppliance,
    markDone,
    completing,
    addInvoice: () => scanner.start('SERVICE'),
  };
}
