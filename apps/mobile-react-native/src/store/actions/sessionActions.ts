import { secureStorage } from '@/services/storage/secureStorage';
import { signOut as signOutOfGroceries } from '../groceries/actions/sessionActions';
import { authenticationService } from '../services/authenticationService';
import { credentialsReceived, signedOut } from '../slices/authSlice';
import { createAppAsyncThunk } from './createAppAsyncThunk';

/** Restores tokens from SecureStore at launch. Expiry is handled lazily by the base query. */
export const restoreSession = createAppAsyncThunk('session/restore', async (_arg, { dispatch }) => {
  const tokens = await secureStorage.loadTokens();
  dispatch(tokens ? credentialsReceived(tokens) : signedOut());
});

/** Revokes the refresh token on the server (best effort), then clears local state. */
export const signOut = createAppAsyncThunk('session/signOut', async (_arg, { dispatch, getState }) => {
  const refreshToken = getState().auth.refreshToken;
  if (refreshToken) {
    await dispatch(authenticationService.endpoints.logout.initiate({ refreshToken }))
      .unwrap()
      .catch(() => undefined);
  }
  dispatch(signedOut());
  // One app, one sign-out: leave the groceries account too.
  if (getState().groceriesAuth.status === 'signedIn') await dispatch(signOutOfGroceries());
});
