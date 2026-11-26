import type { ListsOverview, ShoppingList, ShoppingListItem } from '@/types/api/models';
import { baseApi } from '../middlewares/createApi';

/** Market lists, with the last price paid for each product. */
export const listService = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getLists: build.query<ListsOverview, void>({
      query: () => '/lists',
      providesTags: ['List'],
    }),
    createList: build.mutation<ShoppingList, { name: string }>({
      query: (body) => ({ url: '/lists', method: 'POST', body }),
      invalidatesTags: ['List'],
    }),
    renameList: build.mutation<ShoppingList, { id: string; name: string }>({
      query: ({ id, name }) => ({ url: `/lists/${id}`, method: 'PATCH', body: { name } }),
      invalidatesTags: ['List'],
    }),
    deleteList: build.mutation<void, string>({
      query: (id) => ({ url: `/lists/${id}`, method: 'DELETE' }),
      invalidatesTags: ['List'],
    }),
    addListItem: build.mutation<ShoppingListItem, { listId: string; name: string }>({
      query: ({ listId, name }) => ({ url: `/lists/${listId}/items`, method: 'POST', body: { name } }),
      invalidatesTags: ['List'],
    }),
    /** Optimistic tick: the box fills on tap. */
    toggleListItem: build.mutation<ShoppingListItem, { id: string; done: boolean }>({
      query: ({ id, done }) => ({ url: `/list-items/${id}`, method: 'PATCH', body: { done } }),
      async onQueryStarted({ id, done }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          listService.util.updateQueryData('getLists', undefined, (overview) => {
            for (const list of overview.lists) {
              const item = list.items.find((i) => i.id === id);
              if (item) item.done = done;
            }
          }),
        );
        await queryFulfilled.catch(() => patch.undo());
      },
    }),
    removeListItem: build.mutation<void, string>({
      query: (id) => ({ url: `/list-items/${id}`, method: 'DELETE' }),
      invalidatesTags: ['List'],
    }),
  }),
});

export const {
  useGetListsQuery,
  useCreateListMutation,
  useRenameListMutation,
  useDeleteListMutation,
  useAddListItemMutation,
  useToggleListItemMutation,
  useRemoveListItemMutation,
} = listService;
