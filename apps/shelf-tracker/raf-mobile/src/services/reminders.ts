import * as Notifications from 'expo-notifications';
import { REMINDER_HOUR } from '@/constants/domain';

export interface ReminderItem {
  id: string;
  name: string;
  expiresAt: string;
}

export interface ReminderText {
  title: (count: number, days: number) => string;
  body: (names: string[]) => string;
}

/** Shows reminders as banners even while the app is open. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function remindersAllowed(ask: boolean): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted || !ask || !current.canAskAgain) return current.granted;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/**
 * Replaces every scheduled expiry reminder: one notification per day, at
 * 09:00, `leadDays` before the products bought together expire.
 */
export async function scheduleExpiryReminders(items: ReminderItem[], leadDays: number, text: ReminderText) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  const byDay = new Map<number, ReminderItem[]>();
  for (const item of items) {
    const at = new Date(item.expiresAt);
    at.setDate(at.getDate() - leadDays);
    at.setHours(REMINDER_HOUR, 0, 0, 0);
    if (at.getTime() <= Date.now()) continue;
    byDay.set(at.getTime(), [...(byDay.get(at.getTime()) ?? []), item]);
  }
  for (const [at, group] of byDay) {
    const first = group[0];
    if (!first) continue;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: text.title(group.length, leadDays),
        body: text.body(group.map((i) => i.name)),
        data: { url: group.length === 1 ? `raf://product/${first.id}` : 'raf://shelf' },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
    });
  }
}

export const cancelReminders = () => Notifications.cancelAllScheduledNotificationsAsync();

/** Opens the deep link a reminder carries when the user taps it. */
export function onReminderTapped(open: (url: string) => void) {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const url = response.notification.request.content.data?.url;
    if (typeof url === 'string') open(url);
  });
  return () => subscription.remove();
}
