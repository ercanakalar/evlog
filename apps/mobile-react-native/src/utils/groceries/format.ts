const DAY = 86_400_000;

export const toLocale = (language: string) => (language === 'tr' ? 'tr-TR' : 'en-GB');

/** "3451" -> "₺3,451.00" (en) / "₺3.451,00" (tr). */
export const formatMoney = (
  value: string | number | null | undefined,
  currency = 'TRY',
  language = 'en',
) => {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat(language === 'tr' ? 'tr-TR' : 'en-US', {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
};

/** en-GB puts a comma after the weekday ("Mon, 16 Nov"); the receipt style drops it. */
/** Quantity printed on a receipt line: "× 2" for pieces, "" for one; weighed lines carry it in the name. */
export const lineQuantity = (quantity: string, unit: string | null) => {
  const n = Number(quantity);
  return (!unit || unit === 'pcs') && n !== 1 ? `× ${n}` : '';
};

/** "1.25" / "1,25"; up to 3 decimals, no trailing zeros. */
export const formatAmount = (value: number, language = 'en') =>
  new Intl.NumberFormat(language === 'tr' ? 'tr-TR' : 'en-US', { maximumFractionDigits: 3 }).format(value);

const fmt = (iso: string, language: string, options: Intl.DateTimeFormatOptions) =>
  new Date(iso).toLocaleDateString(toLocale(language), options).replace(/^(\p{L}+),/u, '$1');

/** "Mon 16 Nov" */
export const formatDay = (iso: string | null | undefined, language: string) =>
  iso ? fmt(iso, language, { weekday: 'short', day: 'numeric', month: 'short' }) : '—';

/** "16 Nov" */
export const formatShortDate = (iso: string | null | undefined, language: string) =>
  iso ? fmt(iso, language, { day: 'numeric', month: 'short' }) : '—';

/** "Mon 16 Nov 2026" */
export const formatLongDate = (iso: string | null | undefined, language: string) =>
  iso ? fmt(iso, language, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '—';

/** "18:42" */
export const formatTime = (iso: string | null | undefined, language: string) =>
  iso ? new Date(iso).toLocaleTimeString(toLocale(language), { hour: '2-digit', minute: '2-digit' }) : '';

/** "YYYY-MM" -> "November" / "Nov" */
export const formatMonth = (month: string, language: string, style: 'long' | 'short' = 'long') => {
  const [y, m] = month.split('-').map(Number);
  // en-US abbreviates September as "Sep" (en-GB says "Sept").
  const locale = language === 'tr' ? 'tr-TR' : 'en-US';
  return new Date(y ?? 2000, (m ?? 1) - 1, 15).toLocaleDateString(locale, { month: style });
};

export const daysSince = (iso: string) =>
  Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / DAY));

/** ISO date (YYYY-MM-DD) for a date in local time. */
export const isoDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** "YYYY-MM" for a date in local time. */
export const monthKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

/** Two initials for the avatar: "Deniz Yılmaz" -> "DY". */
export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase() ?? '')
    .join('');
