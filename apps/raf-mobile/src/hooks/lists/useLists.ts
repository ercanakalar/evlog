import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useModal } from '@/components/ui';
import { useErrorAlert } from '@/hooks/common/useErrorAlert';
import type { ShoppingList } from '@/types/api/models';
import {
  useAddListItemMutation,
  useCreateListMutation,
  useDeleteListMutation,
  useGetListsQuery,
  useRemoveListItemMutation,
  useRenameListMutation,
  useToggleListItemMutation,
} from '@/store/services/listService';

/** Market lists: pick one, add products, tick them off in the shop. */
export function useLists() {
  const { t } = useTranslation();
  const showError = useErrorAlert();
  const modal = useModal();
  const overview = useGetListsQuery();
  const [createList, createState] = useCreateListMutation();
  const [renameList] = useRenameListMutation();
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
    /** Rename or delete a list, from its options button or a long press on its chip. */
    openOptions: (list: ShoppingList) =>
      modal.choose({
        title: list.name,
        message: t('lists.itemCount', { count: list.items.length }),
        choices: [
          {
            label: t('lists.rename'),
            onPress: () =>
              modal.prompt({
                title: t('lists.renameTitle'),
                label: t('lists.name'),
                initial: list.name,
                submitLabel: t('common.save'),
                // Server errors throw, so the modal stays open with a message.
                onSubmit: (name) => (name === list.name ? undefined : renameList({ id: list.id, name }).unwrap()),
              }),
          },
          {
            label: t('lists.delete'),
            destructive: true,
            onPress: () =>
              modal.confirm({
                title: t('lists.deleteTitle', { name: list.name }),
                message: list.items.length > 0 ? t('lists.deleteBody', { count: list.items.length }) : undefined,
                confirmLabel: t('lists.delete'),
                destructive: true,
                onConfirm: () =>
                  deleteList(list.id)
                    .unwrap()
                    .then(() => {
                      if (list.id === activeId) setActiveId(undefined);
                    })
                    .catch(fail),
              }),
          },
        ],
      }),
    add,
    toggle: (id: string, done: boolean) => void toggle({ id, done }),
    removeItem: (id: string) => void removeItem(id).unwrap().catch(fail),
    /** Running-low products not already on this list. */
    runningLow: (overview.data?.runningLow ?? []).filter((l) => !onList.has(l.name.toLocaleLowerCase())),
    remaining: open.length,
    estimate: open.reduce((sum, i) => sum + Number(i.lastPrice ?? 0), 0),
  };
}
