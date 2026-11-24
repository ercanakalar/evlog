import { secureStorage } from '@/services/storage/secureStorage';
import { authenticationService } from '../services/authenticationService';
import { credentialsReceived, signedOut } from '../slices/authSlice';
import { baseApi } from './createApi';
import { startAppListening } from './listener';

/**
 * Auth side effects:
 *  - login/register/Google responses become credentials in the store
 *  - credentials are mirrored to SecureStore (Keychain / Keystore)
 *  - signing out wipes stored tokens and every cached API response
 */
export function registerAuthListeners() {
  const { login, register, google } = authenticationService.endpoints;
  const signedIn = (action: unknown) =>
    login.matchFulfilled(action) || register.matchFulfilled(action) || google.matchFulfilled(action);
  startAppListening({
    predicate: signedIn,
    effect: (action, { dispatch }) => {
      if (!login.matchFulfilled(action) && !register.matchFulfilled(action) && !google.matchFulfilled(action)) {
        return;
      }
      const { accessToken, refreshToken } = action.payload;
      dispatch(credentialsReceived({ accessToken, refreshToken }));
    },
  });

  startAppListening({
    actionCreator: credentialsReceived,
    effect: async ({ payload }) => {
      await secureStorage.saveTokens(payload);
    },
  });

  startAppListening({
    actionCreator: signedOut,
    effect: async (_action, { dispatch }) => {
      dispatch(baseApi.util.resetApiState());
      await secureStorage.clearTokens();
    },
  });
}
