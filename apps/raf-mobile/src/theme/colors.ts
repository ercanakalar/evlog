/** Design tokens from the Raf mockups ("receipt paper" on a pale ground, lime accent). */
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
};

export const palettes = { light, dark } as const;
