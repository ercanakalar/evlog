import { randomInt } from 'node:crypto';

/** No 0/O, 1/I/L: a code read aloud or copied by hand stays right. */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const LENGTH = 8;

/** A new invite code, stored without its dash: "K7PM4QXR" (shown as "K7PM-4QXR"). */
export function newInviteCode(): string {
  return Array.from({ length: LENGTH }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
}

/** The code as typed ("k7pm 4qxr", "K7PM-4QXR") as it is stored, or null if it cannot be one. */
export function parseInviteCode(input: string): string | null {
  const code = input.toUpperCase().replace(/[\s-]/g, '');
  if (code.length !== LENGTH) return null;
  return code.split('').every((c) => ALPHABET.includes(c)) ? code : null;
}

/** "K7PM4QXR" -> "K7PM-4QXR". */
export const showInviteCode = (code: string) => `${code.slice(0, 4)}-${code.slice(4)}`;
