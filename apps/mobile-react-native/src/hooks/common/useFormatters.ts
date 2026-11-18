import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  daysSince,
  formatDateTime,
  formatMoney,
  formatMonthYear,
  formatShortDate,
} from '@/utils/format';

/** Locale-aware formatters bound to the current language. */
export function useFormatters() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  return useMemo(
    () => ({
      money: (value: string | number | null | undefined, currency?: string) => formatMoney(value, currency, lang),
      shortDate: (iso: string | null | undefined) => formatShortDate(iso, lang),
      monthYear: (iso: string) => formatMonthYear(iso, lang),
      dateTime: (iso: string | null | undefined) => formatDateTime(iso, lang),
      ago: (iso: string) => {
        const days = daysSince(iso);
        if (days === 0) return t('time.today');
        if (days === 1) return t('time.yesterday');
        if (days < 14) return t('time.daysAgo', { count: days });
        if (days < 60) return t('time.weeksAgo', { count: Math.round(days / 7) });
        return t('time.monthsAgo', { count: Math.round(days / 30) });
      },
      interval: (days: number) => {
        if (days % 365 === 0) return t('upkeep.every.year', { count: days / 365 });
        if (days % 30 === 0) return t('upkeep.every.month', { count: days / 30 });
        if (days % 7 === 0) return t('upkeep.every.week', { count: days / 7 });
        return t('upkeep.every.day', { count: days });
      },
    }),
    [t, lang],
  );
}
