const DAY = 86_400_000;

const toLocale = (language: string) => (language === 'tr' ? 'tr-TR' : 'en-GB');

/** "842.5" -> "842,50 TL" */
export const formatMoney = (
  value: string | number | null | undefined,
  currency = 'TRY',
  language = 'tr',
) => {
  if (value === null || value === undefined) return '—';
  const amount = new Intl.NumberFormat(toLocale(language), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
  return `${amount} ${currency === 'TRY' ? 'TL' : currency}`;
};

export const formatShortDate = (iso: string | null | undefined, language: string) =>
  iso ? new Date(iso).toLocaleDateString(toLocale(language), { day: 'numeric', month: 'short' }) : '—';

export const formatMonthYear = (iso: string, language: string) =>
  new Date(iso).toLocaleDateString(toLocale(language), { month: 'short', year: 'numeric' });

export const formatDateTime = (iso: string | null | undefined, language: string) =>
  iso
    ? new Date(iso).toLocaleString(toLocale(language), {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

export const daysSince = (iso: string) =>
  Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / DAY));

/** ISO date (YYYY-MM-DD) for today in local time. */
export const todayIsoDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
