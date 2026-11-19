import { DarkTheme, DefaultTheme, type Theme as NavigationTheme } from '@react-navigation/native';
import { createContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { useAppSelector } from '@/store/hooks';
import { selectFontPreference, selectPalettePreference, selectThemePreference } from '@/store/slices/settingsSlice';
import { palettes, type Palette } from './colors';
import { FONT_SETS, type Fonts } from './fonts';

export interface Theme {
  colors: Palette;
  /** Font families of the chosen font style. */
  fonts: Fonts;
  dark: boolean;
  /** Matching theme for React Navigation containers. */
  navigation: NavigationTheme;
}

export const ThemeContext = createContext<Theme | null>(null);

/** Resolves the user's theme preference (system/light/dark) palette and font style. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const preference = useAppSelector(selectThemePreference);
  const palette = useAppSelector(selectPalettePreference);
  const font = useAppSelector(selectFontPreference);
  const system = useColorScheme();
  const dark = preference === 'system' ? system === 'dark' : preference === 'dark';

  const value = useMemo<Theme>(() => {
    // A palette or font style saved by a later version may not exist here.
    const pair = palettes[palette] ?? palettes.lime;
    const colors = dark ? pair.dark : pair.light;
    const base = dark ? DarkTheme : DefaultTheme;
    const fonts = (FONT_SETS[font] ?? FONT_SETS.receipt).fonts;
    return {
      colors,
      fonts,
      dark,
      navigation: {
        ...base,
        colors: {
          ...base.colors,
          primary: colors.text,
          background: colors.background,
          card: colors.card,
          text: colors.text,
          border: colors.border,
        },
      },
    };
  }, [dark, palette, font]);

  return <ThemeContext value={value}>{children}</ThemeContext>;
}
