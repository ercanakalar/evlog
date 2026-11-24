import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '@/types/store';
import type { AuthState } from '@/types/store/state';

interface Credentials {
  accessToken: string;
  refreshToken: string;
}

const initialState: AuthState = { status: 'restoring', accessToken: null, refreshToken: null };

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /** After login, register, a token refresh, or restoring from SecureStore. */
    credentialsReceived(state, action: PayloadAction<Credentials>) {
      state.status = 'signedIn';
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
    },
    signedOut() {
      return { status: 'signedOut', accessToken: null, refreshToken: null } satisfies AuthState;
    },
  },
});

export const { credentialsReceived, signedOut } = authSlice.actions;
export default authSlice.reducer;

export const selectAuthStatus = (state: RootState) => state.auth.status;
export const selectAccessToken = (state: RootState) => state.auth.accessToken;
export const selectRefreshToken = (state: RootState) => state.auth.refreshToken;
