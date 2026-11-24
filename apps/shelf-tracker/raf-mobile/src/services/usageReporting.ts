/**
 * Anonymous usage reporting. Only feature names are recorded (e.g.
 * "uploadReceipt"), never request bodies, ids or personal data. Calls are
 * gated by the consent middleware; nothing is sent without consent.
 *
 * Plug a provider in `send` (PostHog, Amplitude, your own endpoint…).
 */
type UsageEvent = { name: string; at: number };

const queue: UsageEvent[] = [];
const MAX_QUEUE = 100;

export const usageReporting = {
  track(name: string) {
    queue.push({ name, at: Date.now() });
    if (queue.length > MAX_QUEUE) queue.shift();
    if (__DEV__) console.debug('[usage]', name);
  },
  /** Drops anything queued, e.g. when consent is withdrawn. */
  clear() {
    queue.length = 0;
  },
  pending(): readonly UsageEvent[] {
    return queue;
  },
};
