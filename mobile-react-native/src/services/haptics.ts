import * as Haptics from 'expo-haptics';

// Feedback is a nicety: where the device has none (the web), nothing happens.
const quietly = (run: () => Promise<void>) => void run().catch(() => undefined);

/** A photo was taken. */
export const tapped = () => quietly(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
/** The receipt was read. */
export const succeeded = () => quietly(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
/** Sending or reading went wrong. */
export const failed = () => quietly(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
