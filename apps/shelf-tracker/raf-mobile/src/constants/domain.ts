import type { Category } from '@/types/api/models';

/** Category order used by chips, breakdowns and receipt groups. */
export const CATEGORIES: Category[] = [
  'DAIRY_EGGS', 'MEAT_FISH', 'FRUIT_VEG', 'BAKERY', 'PANTRY', 'DRINKS', 'HOUSEHOLD', 'OTHER',
];

/** Countdown colours: ≤ URGENT days is red, ≤ SOON is amber. */
export const URGENT_DAYS = 2;
export const SOON_DAYS = 7;

/** Long receipts are photographed in at most this many parts (API limit). */
export const MAX_RECEIPT_PARTS = 6;

/** Polling interval while the receipt reader is still working. */
export const RECEIPT_POLL_MS = 2000;
export const TRIPS_PAGE_SIZE = 30;
/** The API waits up to 90 s per photo for the receipt reader; allow for the upload too. */
export const UPLOAD_RECEIPT_TIMEOUT_MS = 180_000;
/** Months shown in the spending chart. */
export const SPENDING_MONTHS = 6;
/** Reminder lead-time options in Settings. */
export const REMINDER_LEAD_DAYS = [1, 2, 3] as const;
/** Local hour at which expiry reminders fire. */
export const REMINDER_HOUR = 9;

/** Plus / minus step on the at-home counter. */
export const HOME_STEP = { PIECE: 1, KG: 0.1 } as const;
