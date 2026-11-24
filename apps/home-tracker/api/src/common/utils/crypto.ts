import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export const sha256 = (data: Buffer | string): string =>
  createHash('sha256').update(data).digest('hex');

export const randomToken = (bytes = 32): string =>
  randomBytes(bytes).toString('base64url');

/** Constant-time string comparison for shared secrets. */
export const safeEqual = (a: string, b: string): boolean => {
  const left = Buffer.from(sha256(a));
  const right = Buffer.from(sha256(b));
  return timingSafeEqual(left, right);
};
