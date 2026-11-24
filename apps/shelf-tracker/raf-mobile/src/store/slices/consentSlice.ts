import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '@/types/store';
import type { ConsentDecision, ConsentState } from '@/types/store/state';
import { persistedStateHydrated } from '../actions/hydration';

const initialState: ConsentState = { usageReporting: 'unknown' };

const consentSlice = createSlice({
  name: 'consent',
  initialState,
  reducers: {
    usageReportingDecided(state, action: PayloadAction<Exclude<ConsentDecision, 'unknown'>>) {
      state.usageReporting = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(persistedStateHydrated, (state, action) => ({ ...state, ...action.payload.consent }));
  },
});

export const { usageReportingDecided } = consentSlice.actions;
export default consentSlice.reducer;

export const selectUsageReportingConsent = (state: RootState) => state.consent.usageReporting;
