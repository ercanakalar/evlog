import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '@/types/store';
import type { LanguagePreference, SettingsState, ThemePreference } from '@/types/store/state';
import { persistedStateHydrated } from '../actions/hydration';

const initialState: SettingsState = { theme: 'system', language: 'system' };

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    themeChanged(state, action: PayloadAction<ThemePreference>) {
      state.theme = action.payload;
    },
    languageChanged(state, action: PayloadAction<LanguagePreference>) {
      state.language = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(persistedStateHydrated, (state, action) => ({ ...state, ...action.payload.settings }));
  },
});

export const { themeChanged, languageChanged } = settingsSlice.actions;
export default settingsSlice.reducer;

export const selectThemePreference = (state: RootState) => state.settings.theme;
export const selectLanguagePreference = (state: RootState) => state.settings.language;
