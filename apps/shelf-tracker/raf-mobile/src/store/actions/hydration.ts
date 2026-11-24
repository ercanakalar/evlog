import { createAction } from '@reduxjs/toolkit';
import type { PersistedState } from '@/types/store/state';

/** Dispatched once at startup with whatever was saved in AsyncStorage. */
export const persistedStateHydrated = createAction<Partial<PersistedState>>('app/persistedStateHydrated');
