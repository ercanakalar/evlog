import { DarkTheme, DefaultTheme, type Theme as NavigationTheme } from '@react-navigation/native';
import { createContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { useAppSelector } from '@/store/hooks';
import { selectThemePreference } from '@/store/slices/settingsSlice';
import { palettes, type Palette } from './colors';

export interface Theme {
  colors: Palette;
  dark: boolean;
  /** Matching theme for React Navigation containers. */
  navigation: NavigationTheme;
}

export const ThemeContext = createContext<Theme | null>(null);

/** Resolves the user's theme preference (system/light/dark) into colours. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const preference = useAppSelector(selectThemePreference);
  const system = useColorScheme();
  const dark = preference === 'system' ? system === 'dark' : preference === 'dark';

  const value = useMemo<Theme>(() => {
    const colors = dark ? palettes.dark : palettes.light;
    const base = dark ? DarkTheme : DefaultTheme;
    return {
      colors,
      dark,
      navigation: {
        ...base,
        colors: {
          ...base.colors,
          primary: colors.primary,
          background: colors.background,
          card: colors.card,
          text: colors.text,
          border: colors.border,
        },
      },
    };
  }, [dark]);

  return <ThemeContext value={value}>{children}</ThemeContext>;
}
