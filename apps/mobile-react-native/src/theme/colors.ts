/** Design tokens taken from the Evlog light and dark mockups. */
const light = {
  background: '#F2F2F7',
  card: '#FFFFFF',
  cardMuted: '#E6E6F0',
  border: '#E4E4EC',
  text: '#14141F',
  textMuted: '#6B6B7B',
  primary: '#5B5BD6',
  primarySoft: '#E4E4FA',
  onPrimary: '#FFFFFF',
  ink: '#1C1C28',
  onInk: '#FFFFFF',
  warmBg: '#FFE4D4',
  warmText: '#B4531B',
  successBg: '#E1F4E6',
  successText: '#1E7B3A',
  dangerBg: '#FFE0D5',
  dangerText: '#C2410C',
  star: '#1C1C28',
  starEmpty: '#C9C9D6',
};

export type Palette = typeof light;

const dark: Palette = {
  background: '#15151B',
  card: '#212129',
  cardMuted: '#2C2C37',
  border: '#2E2E3A',
  text: '#F2F2F7',
  textMuted: '#9B9BAD',
  primary: '#5B5BD6',
  primarySoft: '#2E2E5C',
  onPrimary: '#FFFFFF',
  ink: '#2C2C37',
  onInk: '#FFFFFF',
  warmBg: '#3B281D',
  warmText: '#F2A26E',
  successBg: '#1D3526',
  successText: '#6FD08C',
  dangerBg: '#40261C',
  dangerText: '#F59E72',
  star: '#F2F2F7',
  starEmpty: '#4A4A58',
};

export const palettes = { light, dark } as const;
