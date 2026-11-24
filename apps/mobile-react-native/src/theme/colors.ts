import type { PalettePreference } from '@/types/store/state';

/** Design tokens: "receipt paper" on a pale ground, ink for primary actions, a pale highlighter accent. */
const light = {
  /** Screen ground. */
  background: '#F2F3EF',
  /** Receipt paper: cards, inputs, sheets. */
  card: '#FCFCFA',
  /** Segmented-control track. */
  cardMuted: '#E3E5DF',
  /** Small tags (category, shelf life). */
  tag: '#E8EAE4',
  /** Solid hairlines (sheet tops, dividers). */
  border: '#CFD2CB',
  /** Dashed receipt rules. */
  rule: '#A9ADA7',
  /** Input outlines. */
  inputBorder: '#7E837E',
  text: '#15181A',
  textMuted: '#565B5E',
  textSoft: '#454A4D',
  /** Lime highlighter: scan button, active tab, "at home" tags. */
  accent: '#D8F34A',
  onAccent: '#15181A',
  /** Dark surfaces: primary buttons, tab bar, receipt header. */
  ink: '#15181A',
  onInk: '#FCFCFA',
  onInkMuted: '#D5D8D3',
  tabInactive: '#C4C8C3',
  /** Empty countdown ticks. */
  tick: '#D4D6D0',
  /** ≤ 2 days left. */
  urgentBar: '#C8410E',
  urgentText: '#B5380A',
  /** ≤ 7 days left. */
  soonBar: '#E09A12',
  soonText: '#7A5200',
  /** Plenty of time. */
  calmBar: '#15181A',
  switchOff: '#8A8F8A',
  /** Camera screen. */
  scanner: '#0E1011',
  receiptPaper: '#E9EAE4',
  /** Verified / confirmed (condition records, receipt-backed ratings). */
  successBg: '#DDF1E2',
  successText: '#1E6B34',
  /** Needs attention: due upkeep, unverified scores. */
  warmBg: '#FBE7D2',
  warmText: '#8A4A10',
  /** Errors and destructive states. */
  dangerBg: '#FBE0D6',
  dangerText: '#B5380A',
  star: '#15181A',
  starEmpty: '#C4C8C3',
};

export type Palette = typeof light;

const dark: Palette = {
  background: '#101213',
  card: '#1C1F21',
  cardMuted: '#2A2D2F',
  tag: '#2E3234',
  border: '#34383A',
  rule: '#5C6163',
  inputBorder: '#7A7F7B',
  text: '#ECEDE8',
  textMuted: '#A9AEAA',
  textSoft: '#BEC2BE',
  accent: '#D8F34A',
  onAccent: '#15181A',
  ink: '#ECEDE8',
  onInk: '#15181A',
  onInkMuted: '#3B4043',
  tabInactive: '#9DA29E',
  tick: '#3A3E40',
  urgentBar: '#E0612E',
  urgentText: '#FF8A5C',
  soonBar: '#E09A12',
  soonText: '#F2B544',
  calmBar: '#ECEDE8',
  switchOff: '#6B706C',
  scanner: '#0E1011',
  receiptPaper: '#E9EAE4',
  successBg: '#1B3324',
  successText: '#7BD597',
  warmBg: '#3A2918',
  warmText: '#F2B57A',
  dangerBg: '#3E241B',
  dangerText: '#FF8A5C',
  star: '#ECEDE8',
  starEmpty: '#4A4F51',
};

/** What a palette changes: the highlighter and the tint of the ground, paper and rules. */
type Tint = Pick<Palette, 'background' | 'card' | 'cardMuted' | 'tag' | 'border' | 'accent'> & Partial<Palette>;

const tinted = (base: Palette, tint: Tint): Palette => ({ ...base, ...tint });

/**
 * Each palette is a light/dark pair. Accents are pale highlighters so dark
 * text (`onAccent`) stays readable on them, and none is orange, amber or red,
 * which the expiry countdown uses.
 */
export const palettes: Record<PalettePreference, { light: Palette; dark: Palette }> = {
  lime: { light, dark },
  mint: {
    light: tinted(light, {
      background: '#EFF3F1',
      card: '#FBFCFB',
      cardMuted: '#DFE6E2',
      tag: '#E4EAE7',
      border: '#CAD3CF',
      rule: '#A5AEAA',
      accent: '#7FE0B4',
    }),
    dark: tinted(dark, {
      background: '#0F1312',
      card: '#1A201E',
      cardMuted: '#272E2C',
      tag: '#2B3330',
      border: '#323A37',
      accent: '#7FE0B4',
    }),
  },
  sky: {
    light: tinted(light, {
      background: '#EFF2F5',
      card: '#FBFCFD',
      cardMuted: '#DFE4EA',
      tag: '#E4E9EE',
      border: '#CBD2DA',
      rule: '#A6AEB7',
      accent: '#8FD3FF',
    }),
    dark: tinted(dark, {
      background: '#0F1215',
      card: '#1A1F23',
      cardMuted: '#272C31',
      tag: '#2B3136',
      border: '#32383E',
      accent: '#8FD3FF',
    }),
  },
  lilac: {
    light: tinted(light, {
      background: '#F2F1F5',
      card: '#FCFBFD',
      cardMuted: '#E4E1EA',
      tag: '#E9E6EE',
      border: '#D0CCD8',
      rule: '#ABA7B4',
      accent: '#C8B4FF',
    }),
    dark: tinted(dark, {
      background: '#121116',
      card: '#1E1C23',
      cardMuted: '#2B2931',
      tag: '#2F2D36',
      border: '#36343D',
      accent: '#C8B4FF',
    }),
  },
  rose: {
    light: tinted(light, {
      background: '#F5F1F1',
      card: '#FDFBFB',
      cardMuted: '#EAE2E3',
      tag: '#EEE7E8',
      border: '#D8CDCF',
      rule: '#B3A8AA',
      accent: '#FFA6CF',
    }),
    dark: tinted(dark, {
      background: '#151112',
      card: '#221C1E',
      cardMuted: '#30292B',
      tag: '#342D2F',
      border: '#3C3537',
      accent: '#FFA6CF',
    }),
  },
  lemon: {
    light: tinted(light, {
      background: '#F4F3EC',
      card: '#FDFCF8',
      cardMuted: '#E7E5DA',
      tag: '#ECEADF',
      border: '#D5D2C5',
      rule: '#AFAB9E',
      accent: '#FFE958',
    }),
    dark: tinted(dark, {
      background: '#131210',
      card: '#201E1A',
      cardMuted: '#2D2B26',
      tag: '#322F29',
      border: '#3A3730',
      accent: '#FFE958',
    }),
  },
  aqua: {
    light: tinted(light, {
      background: '#EEF3F3',
      card: '#FAFCFC',
      cardMuted: '#DDE6E6',
      tag: '#E2EAEA',
      border: '#C8D4D4',
      rule: '#A3AFAF',
      accent: '#6FE3E0',
    }),
    dark: tinted(dark, {
      background: '#0E1314',
      card: '#192021',
      cardMuted: '#252E2F',
      tag: '#293334',
      border: '#30393A',
      accent: '#6FE3E0',
    }),
  },
  orchid: {
    light: tinted(light, {
      background: '#F4F0F4',
      card: '#FDFBFD',
      cardMuted: '#E8E0E8',
      tag: '#EDE6ED',
      border: '#D6CCD6',
      rule: '#B1A6B1',
      accent: '#F2A8F5',
    }),
    dark: tinted(dark, {
      background: '#141114',
      card: '#211B21',
      cardMuted: '#2E282E',
      tag: '#332C33',
      border: '#3B343B',
      accent: '#F2A8F5',
    }),
  },
};

export const PALETTE_NAMES = Object.keys(palettes) as PalettePreference[];
