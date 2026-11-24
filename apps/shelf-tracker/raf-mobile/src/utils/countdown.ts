import { SOON_DAYS, URGENT_DAYS } from '@/constants/domain';
import type { Palette } from '@/theme';

export type CountdownTone = 'urgent' | 'soon' | 'calm';

export const countdownTone = (daysLeft: number | null): CountdownTone =>
  daysLeft === null ? 'calm' : daysLeft <= URGENT_DAYS ? 'urgent' : daysLeft <= SOON_DAYS ? 'soon' : 'calm';

/** Bar and text colours for a countdown. */
export const countdownColors = (daysLeft: number | null, colors: Palette) => {
  const tone = countdownTone(daysLeft);
  return {
    bar: { urgent: colors.urgentBar, soon: colors.soonBar, calm: colors.calmBar }[tone],
    text: { urgent: colors.urgentText, soon: colors.soonText, calm: colors.text }[tone],
  };
};

/** Share of the shelf life still left, never quite empty so the bar shows. */
export const countdownProgress = (daysLeft: number | null, totalDays: number | null) =>
  daysLeft === null || !totalDays ? 1 : Math.max(0.04, Math.min(1, daysLeft / totalDays));
