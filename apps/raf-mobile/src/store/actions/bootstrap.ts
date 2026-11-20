import { StorageKeys } from '@/constants/storageKeys';
import { jsonStorage } from '@/services/storage/asyncStorage';
import type { PersistedState } from '@/types/store/state';
import { persistedStateHydrated } from './hydration';
import { createAppAsyncThunk } from './createAppAsyncThunk';
import { restoreSession } from './sessionActions';

const isPersistedState = (value: unknown): value is Partial<PersistedState> =>
  typeof value === 'object' && value !== null;

/** Runs once on launch: saved preferences first, then the auth session. */
export const bootstrapApp = createAppAsyncThunk('app/bootstrap', async (_arg, { dispatch }) => {
  const saved = await jsonStorage.read(StorageKeys.persistedState, isPersistedState);
  if (saved) dispatch(persistedStateHydrated(saved));
  await dispatch(restoreSession());
});
