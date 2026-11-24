import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '@/types/store';
import type { FontPreference, LanguagePreference, PalettePreference, SettingsState, ThemePreference } from '@/types/store/state';
import { persistedStateHydrated } from '../actions/hydration';

const initialState: SettingsState = { theme: 'system', palette: 'lilac', font: 'receipt', language: 'system' };

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    themeChanged(state, action: PayloadAction<ThemePreference>) {
      state.theme = action.payload;
    },
    paletteChanged(state, action: PayloadAction<PalettePreference>) {
      state.palette = action.payload;
    },
    fontChanged(state, action: PayloadAction<FontPreference>) {
      state.font = action.payload;
    },
    languageChanged(state, action: PayloadAction<LanguagePreference>) {
      state.language = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(persistedStateHydrated, (state, action) => ({ ...state, ...action.payload.settings }));
  },
});

export const { themeChanged, paletteChanged, fontChanged, languageChanged } = settingsSlice.actions;
export default settingsSlice.reducer;

export const selectThemePreference = (state: RootState) => state.settings.theme;
export const selectPalettePreference = (state: RootState) => state.settings.palette;
export const selectFontPreference = (state: RootState) => state.settings.font;
export const selectLanguagePreference = (state: RootState) => state.settings.language;
