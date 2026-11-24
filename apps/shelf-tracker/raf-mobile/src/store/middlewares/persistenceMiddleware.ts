import { StorageKeys } from '@/constants/storageKeys';
import { jsonStorage } from '@/services/storage/asyncStorage';
import type { PersistedState } from '@/types/store/state';
import { persistedStateHydrated } from '../actions/hydration';
import { startAppListening } from './listener';

const PERSISTED_SLICES = ['settings/', 'consent/'];

/** Writes settings and consent to AsyncStorage (debounced). */
export function registerPersistenceListeners() {
  startAppListening({
    predicate: (action) =>
      action.type !== persistedStateHydrated.type &&
      PERSISTED_SLICES.some((prefix) => action.type.startsWith(prefix)),
    effect: async (_action, { getState, cancelActiveListeners, delay }) => {
      cancelActiveListeners();
      await delay(300);
      const { settings, consent } = getState();
      const snapshot: PersistedState = { settings, consent };
      await jsonStorage.write(StorageKeys.persistedState, snapshot);
    },
  });
}
