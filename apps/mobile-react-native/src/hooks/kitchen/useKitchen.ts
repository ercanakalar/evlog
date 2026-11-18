import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import { useAddToShoppingListMutation, useGetKitchenQuery } from '@/store/services/kitchenService';
import { useCurrentHome } from '../common/useCurrentHome';
import { useErrorAlert } from '../common/useErrorAlert';
import { useReceiptScanner } from '../receipts/useReceiptScanner';

export function useKitchen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const showError = useErrorAlert();
  const { home } = useCurrentHome();
  const kitchen = useGetKitchenQuery(home.id);
  const [addToList] = useAddToShoppingListMutation();
  const scanner = useReceiptScanner(home.id);

  const addToShoppingList = (name: string) =>
    addToList({ homeId: home.id, name })
      .unwrap()
      .then(() => Alert.alert(t('common.added'), t('kitchen.addedToList', { name })))
      .catch((error: unknown) => showError(t('common.somethingWrong'), error));

  return {
    kitchen: kitchen.data,
    isLoading: kitchen.isLoading,
    isRefreshing: kitchen.isFetching && !kitchen.isLoading,
    error: kitchen.error,
    refresh: kitchen.refetch,
    scanGroceries: () => scanner.start('GROCERY'),
    scanning: scanner.scanning,
    addToShoppingList,
    openReceipt: (receiptId: string) => navigation.navigate('ReceiptReview', { receiptId }),
  };
}
