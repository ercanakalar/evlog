import { useColorScheme } from 'react-native';
import { palette, type Palette } from './colors';

export function useTheme(): { colors: Palette; dark: boolean } {
  const dark = useColorScheme() === 'dark';
  return { colors: dark ? palette.dark : palette.light, dark };
}
