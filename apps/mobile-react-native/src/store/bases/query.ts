/** Drops undefined values so query strings stay clean. */
export const compact = <T extends Record<string, unknown>>(value: T) =>
  Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined && v !== '')) as Partial<T>;

/** The phone's offset from UTC in minutes, so the API counts months in local time. */
export const utcOffset = () => -new Date().getTimezoneOffset();
