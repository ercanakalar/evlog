import {
  AtkinsonHyperlegibleMono_400Regular,
  AtkinsonHyperlegibleMono_500Medium,
  AtkinsonHyperlegibleMono_700Bold,
} from '@expo-google-fonts/atkinson-hyperlegible-mono';
import {
  AtkinsonHyperlegibleNext_400Regular,
  AtkinsonHyperlegibleNext_500Medium,
  AtkinsonHyperlegibleNext_600SemiBold,
  AtkinsonHyperlegibleNext_700Bold,
} from '@expo-google-fonts/atkinson-hyperlegible-next';
import { FiraCode_400Regular, FiraCode_500Medium, FiraCode_700Bold } from '@expo-google-fonts/fira-code';
import { Fraunces_500Medium, Fraunces_600SemiBold, Fraunces_700Bold } from '@expo-google-fonts/fraunces';
import { IBMPlexMono_400Regular, IBMPlexMono_500Medium, IBMPlexMono_700Bold } from '@expo-google-fonts/ibm-plex-mono';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import { Nunito_400Regular, Nunito_500Medium, Nunito_600SemiBold, Nunito_700Bold } from '@expo-google-fonts/nunito';
import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import type { FontPreference } from '@/types/store/state';

/**
 * Font family names for text, headings and anything printed "on the receipt"
 * (amounts, dates). Custom fonts ignore fontWeight, so each weight is its own family.
 */
export interface Fonts {
  body: string;
  bodyMedium: string;
  bodySemiBold: string;
  heading: string;
  headingBold: string;
  headingMedium: string;
  mono: string;
  monoMedium: string;
  monoBold: string;
}

interface FontSet {
  fonts: Fonts;
  /** Files to load for this set, keyed by family name. */
  assets: Record<string, number>;
}

/** Builds a set from font modules, using each export's name as its family. */
const fontSet = (fonts: Record<keyof Fonts, Record<string, number>>): FontSet => {
  const families = {} as Fonts;
  const assets: Record<string, number> = {};
  for (const [role, module] of Object.entries(fonts) as [keyof Fonts, Record<string, number>][]) {
    const [family, asset] = Object.entries(module)[0]!;
    families[role] = family;
    assets[family] = asset;
  }
  return { fonts: families, assets };
};

export const FONT_SETS: Record<FontPreference, FontSet> = {
  /** Inter, Space Grotesk headings and JetBrains Mono: the Raf mockups. */
  receipt: fontSet({
    body: { Inter_400Regular },
    bodyMedium: { Inter_500Medium },
    bodySemiBold: { Inter_600SemiBold },
    heading: { SpaceGrotesk_600SemiBold },
    headingBold: { SpaceGrotesk_700Bold },
    headingMedium: { SpaceGrotesk_500Medium },
    mono: { JetBrainsMono_400Regular },
    monoMedium: { JetBrainsMono_500Medium },
    monoBold: { JetBrainsMono_700Bold },
  }),
  /** Inter with Fraunces serif headings and IBM Plex Mono. */
  editorial: fontSet({
    body: { Inter_400Regular },
    bodyMedium: { Inter_500Medium },
    bodySemiBold: { Inter_600SemiBold },
    heading: { Fraunces_600SemiBold },
    headingBold: { Fraunces_700Bold },
    headingMedium: { Fraunces_500Medium },
    mono: { IBMPlexMono_400Regular },
    monoMedium: { IBMPlexMono_500Medium },
    monoBold: { IBMPlexMono_700Bold },
  }),
  /** Nunito throughout, with Fira Code. */
  rounded: fontSet({
    body: { Nunito_400Regular },
    bodyMedium: { Nunito_500Medium },
    bodySemiBold: { Nunito_600SemiBold },
    heading: { Nunito_600SemiBold },
    headingBold: { Nunito_700Bold },
    headingMedium: { Nunito_500Medium },
    mono: { FiraCode_400Regular },
    monoMedium: { FiraCode_500Medium },
    monoBold: { FiraCode_700Bold },
  }),
  /** Atkinson Hyperlegible, designed so similar letters are easy to tell apart. */
  legible: fontSet({
    body: { AtkinsonHyperlegibleNext_400Regular },
    bodyMedium: { AtkinsonHyperlegibleNext_500Medium },
    bodySemiBold: { AtkinsonHyperlegibleNext_600SemiBold },
    heading: { AtkinsonHyperlegibleNext_600SemiBold },
    headingBold: { AtkinsonHyperlegibleNext_700Bold },
    headingMedium: { AtkinsonHyperlegibleNext_500Medium },
    mono: { AtkinsonHyperlegibleMono_400Regular },
    monoMedium: { AtkinsonHyperlegibleMono_500Medium },
    monoBold: { AtkinsonHyperlegibleMono_700Bold },
  }),
};

export const FONT_STYLE_NAMES = Object.keys(FONT_SETS) as FontPreference[];
