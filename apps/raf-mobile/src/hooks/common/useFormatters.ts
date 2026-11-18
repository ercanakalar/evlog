import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Category, HomeUnit } from '@/types/api/models';
import {
  formatAmount,
  formatDay,
  formatLongDate,
  formatMoney,
  formatMonth,
  formatShortDate,
  formatTime,
} from '@/utils/format';

/** Locale-aware formatters bound to the current language. */
export function useFormatters() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  return useMemo(
    () => ({
      money: (value: string | number | null | undefined, currency?: string) => formatMoney(value, currency, lang),
      day: (iso: string | null | undefined) => formatDay(iso, lang),
      shortDate: (iso: string | null | undefined) => formatShortDate(iso, lang),
      longDate: (iso: string | null | undefined) => formatLongDate(iso, lang),
      time: (iso: string | null | undefined) => formatTime(iso, lang),
      month: (month: string, style?: 'long' | 'short') => formatMonth(month, lang, style),
      category: (category: Category) => t(`categories.${category}`),
      /** At-home amount: "3" for pieces, "1.25 kg" by weight. */
      homeAmount: (count: number, unit: HomeUnit) =>
        unit === 'KG'
          ? t('atHome.kgAmount', { amount: formatAmount(count, lang) })
          : formatAmount(count, lang),
      /** Countdown label as printed on the bar: "TODAY", "1 DAY", "5 DAYS". */
      left: (daysLeft: number | null) =>
        daysLeft === null ? t('countdown.noExpiry') : daysLeft === 0 ? t('countdown.today') : t('countdown.days', { count: daysLeft }),
      /** Shelf life on a receipt line: "Lasts 7 days", "Lasts 2 years", "No expiry". */
      lasts: (days: number | null) => {
        if (days === null) return t('countdown.noExpiry');
        if (days >= 365 && days % 365 < 30) return t('countdown.lastsYears', { count: Math.round(days / 365) });
        if (days >= 60) return t('countdown.lastsMonths', { count: Math.round(days / 30) });
        return t('countdown.lastsDays', { count: days });
      },
    }),
    [t, lang],
  );
}
