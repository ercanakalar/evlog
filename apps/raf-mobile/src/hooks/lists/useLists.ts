import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import { useErrorAlert } from '@/hooks/common/useErrorAlert';
import {
  useAddListItemMutation,
  useCreateListMutation,
  useDeleteListMutation,
  useGetListsQuery,
  useRemoveListItemMutation,
  useToggleListItemMutation,
} from '@/store/services/listService';

/** Market lists: pick one, add products, tick them off in the shop. */
export function useLists() {
  const { t } = useTranslation();
  const showError = useErrorAlert();
  const overview = useGetListsQuery();
  const [createList, createState] = useCreateListMutation();
  const [deleteList] = useDeleteListMutation();
  const [addItem] = useAddListItemMutation();
  const [toggle] = useToggleListItemMutation();
  const [removeItem] = useRemoveListItemMutation();
  const [activeId, setActiveId] = useState<string>();
  const [creating, setCreating] = useState(false);

  const lists = overview.data?.lists ?? [];
  const active = lists.find((l) => l.id === activeId) ?? lists[0];
  const open = active?.items.filter((i) => !i.done) ?? [];
  const onList = new Set(active?.items.map((i) => i.name.toLocaleLowerCase()) ?? []);
  const fail = (error: unknown) => showError(t('common.somethingWrong'), error);

  const add = (name: string) =>
    active ? addItem({ listId: active.id, name }).unwrap().catch(fail) : Promise.resolve();

  return {
    lists,
    active,
    isLoading: overview.isLoading,
    error: overview.error,
    isRefreshing: overview.isFetching && !overview.isLoading,
    refresh: overview.refetch,
    select: setActiveId,
    creating,
    toggleCreating: () => setCreating((v) => !v),
    createBusy: createState.isLoading,
    create: (name: string) =>
      createList({ name })
        .unwrap()
        .then((list) => {
          setActiveId(list.id);
          setCreating(false);
        })
        .catch(fail),
    confirmDelete: (id: string, name: string) =>
      Alert.alert(t('lists.deleteTitle', { name }), undefined, [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('lists.delete'), style: 'destructive', onPress: () => void deleteList(id).unwrap().catch(fail) },
      ]),
    add,
    toggle: (id: string, done: boolean) => void toggle({ id, done }),
    removeItem: (id: string) => void removeItem(id).unwrap().catch(fail),
    /** Running-low products not already on this list. */
    runningLow: (overview.data?.runningLow ?? []).filter((l) => !onList.has(l.name.toLocaleLowerCase())),
    remaining: open.length,
    estimate: open.reduce((sum, i) => sum + Number(i.lastPrice ?? 0), 0),
  };
}
