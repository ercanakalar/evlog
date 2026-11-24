import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Role } from '@/types/api/models';
import type { RootState } from '@/types/store';
import type { SessionState } from '@/types/store/state';
import { persistedStateHydrated } from '../actions/hydration';
import { signedOut } from './authSlice';

const initialState: SessionState = { homeId: null, role: null };

/** Local UI state: which home/role is selected (the Owner/Tenant switch). */
const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    homeSelected(state, action: PayloadAction<{ homeId: string; role: Role }>) {
      state.homeId = action.payload.homeId;
      state.role = action.payload.role;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(persistedStateHydrated, (state, action) => ({ ...state, ...action.payload.session }))
      .addCase(signedOut, () => initialState);
  },
});

export const { homeSelected } = sessionSlice.actions;
export default sessionSlice.reducer;

export const selectSelectedHome = (state: RootState) => state.session;
