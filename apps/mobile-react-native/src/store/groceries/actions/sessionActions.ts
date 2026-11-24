import { groceriesTokenStorage } from '@/services/storage/secureStorage';
import { authenticationService } from '@/store/groceries/services/authenticationService';
import { credentialsReceived, signedOut } from '@/store/groceries/authSlice';
import { createAppAsyncThunk } from '@/store/actions/createAppAsyncThunk';

/** Restores tokens from SecureStore at launch. Expiry is handled lazily by the base query. */
export const restoreSession = createAppAsyncThunk('groceries/restoreSession', async (_arg, { dispatch }) => {
  const tokens = await groceriesTokenStorage.loadTokens();
  dispatch(tokens ? credentialsReceived(tokens) : signedOut());
});

/** Revokes the refresh token on the server (best effort), then clears local state. */
export const signOut = createAppAsyncThunk('groceries/signOut', async (_arg, { dispatch, getState }) => {
  const refreshToken = getState().groceriesAuth.refreshToken;
  if (refreshToken) {
    await dispatch(authenticationService.endpoints.logout.initiate({ refreshToken }))
      .unwrap()
      .catch(() => undefined);
  }
  dispatch(signedOut());
});
