import { groceriesTokenStorage } from '@/services/storage/secureStorage';
import { authenticationService } from '@/store/groceries/services/authenticationService';
import { credentialsReceived, signedOut } from '@/store/groceries/authSlice';
import { groceriesApi } from '@/store/groceries/api';
import { startAppListening } from '@/store/middlewares/listener';

/**
 * Auth side effects:
 *  - login/register/Google responses become credentials in the store
 *  - credentials are mirrored to SecureStore (Keychain / Keystore)
 *  - signing out wipes stored tokens and every cached API response
 */
export function registerGroceriesAuthListeners() {
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
      await groceriesTokenStorage.saveTokens(payload);
    },
  });

  startAppListening({
    actionCreator: signedOut,
    effect: async (_action, { dispatch }) => {
      dispatch(groceriesApi.util.resetApiState());
      await groceriesTokenStorage.clearTokens();
    },
  });
}
