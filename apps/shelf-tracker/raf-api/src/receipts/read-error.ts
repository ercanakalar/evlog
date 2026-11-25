/** Why a photo could not be read, as a code the app has a text for. */
export type ReadError = 'NO_TEXT' | 'NO_ITEMS' | 'NO_DATE' | 'UNREADABLE' | 'READER_UNAVAILABLE';

/** What the readers (built in, and services/receipt-reader) say. */
const KNOWN: [RegExp, ReadError][] = [
  [/^No text found/, 'NO_TEXT'],
  [/^Could not find any items/, 'NO_ITEMS'],
  [/^No expiry date found/, 'NO_DATE'],
];

export const readError = (message: string): ReadError =>
  KNOWN.find(([pattern]) => pattern.test(message))?.[1] ?? 'UNREADABLE';
