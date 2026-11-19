import { isLoaded, loadAsync } from 'expo-font';
import { useEffect, useState } from 'react';
import { useAppSelector } from '@/store/hooks';
import { selectFontPreference } from '@/store/slices/settingsSlice';
import { FONT_SETS, FONT_STYLE_NAMES } from './fonts';

const setLoaded = (assets: Record<string, number>) => Object.keys(assets).every((family) => isLoaded(family));

/**
 * Loads the chosen font style and reports when the app can show text. The
 * other styles load afterwards in the background so Settings can preview
 * them. A failed load falls back to the system font rather than blocking.
 */
export function useThemeFonts(): boolean {
  const font = useAppSelector(selectFontPreference);
  const active = FONT_SETS[font] ?? FONT_SETS.receipt;
  const [ready, setReady] = useState(() => setLoaded(active.assets));

  useEffect(() => {
    let live = true;
    void loadAsync(active.assets)
      .catch(() => undefined)
      .then(() => {
        if (live) setReady(true);
        const rest = FONT_STYLE_NAMES.map((name) => FONT_SETS[name].assets).filter((assets) => !setLoaded(assets));
        return Promise.all(rest.map((assets) => loadAsync(assets).catch(() => undefined)));
      });
    return () => {
      live = false;
    };
  }, [active]);

  return ready;
}
