import { combineReducers, configureStore, type ThunkAction, type UnknownAction } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { AppState } from 'react-native';
import { registerAuthListeners } from './middlewares/authMiddleware';
import { consentMiddleware } from './middlewares/consentMiddleware';
import { baseApi } from './middlewares/createApi';
import { listenerMiddleware } from './middlewares/listener';
import { registerPersistenceListeners } from './middlewares/persistenceMiddleware';
import auth from './slices/authSlice';
import consent from './slices/consentSlice';
import session from './slices/sessionSlice';
import settings from './slices/settingsSlice';

const rootReducer = combineReducers({
  auth,
  session,
  settings,
  consent,
  [baseApi.reducerPath]: baseApi.reducer,
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefault) =>
    getDefault()
      // The listener runs first so its effects see every action.
      .prepend(listenerMiddleware.middleware)
      .concat(baseApi.middleware, consentMiddleware),
});

registerAuthListeners();
registerPersistenceListeners();

// RTK Query's refetchOnFocus / refetchOnReconnect, driven by AppState on native.
setupListeners(store.dispatch, (dispatch, { onFocus, onFocusLost }) => {
  const subscription = AppState.addEventListener('change', (state) => {
    if (state === 'active') dispatch(onFocus());
    else dispatch(onFocusLost());
  });
  return () => subscription.remove();
});

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;
export type AppThunk<R = void> = ThunkAction<R, RootState, unknown, UnknownAction>;
