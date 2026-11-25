import { StorageKeys } from '@/constants/storageKeys';
import { jsonStorage } from '@/services/storage/asyncStorage';
import type { PersistedState } from '@/types/store/state';
import { persistedStateHydrated } from '../actions/hydration';
import { startAppListening } from './listener';

/** Writes settings to AsyncStorage (debounced). */
export function registerPersistenceListeners() {
  startAppListening({
    predicate: (action) =>
      action.type !== persistedStateHydrated.type && action.type.startsWith('settings/'),
    effect: async (_action, { getState, cancelActiveListeners, delay }) => {
      cancelActiveListeners();
      await delay(300);
      const snapshot: PersistedState = { settings: getState().settings };
      await jsonStorage.write(StorageKeys.persistedState, snapshot);
    },
  });
}
