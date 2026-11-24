import * as Linking from 'expo-linking';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { cancelReminders, onReminderTapped, remindersAllowed, scheduleExpiryReminders } from '@/services/reminders';
import { useListShelfQuery } from '@/store/services/itemService';
import { useGetMeQuery } from '@/store/services/meService';

/**
 * Keeps local expiry reminders in step with the shelf and the user's
 * settings. Runs at the root so it follows every saved receipt.
 */
export function useExpiryReminders(signedIn: boolean) {
  const { t } = useTranslation();
  const me = useGetMeQuery(undefined, { skip: !signedIn });
  const enabled = signedIn && me.data?.expiryReminders === true;
  const shelf = useListShelfQuery(undefined, { skip: !enabled });
  const leadDays = me.data?.reminderLeadDays ?? 2;

  useEffect(() => onReminderTapped((url) => void Linking.openURL(url)), []);

  useEffect(() => {
    if (!signedIn || (me.data && !me.data.expiryReminders)) {
      void cancelReminders().catch(() => undefined);
      return;
    }
    if (!shelf.data) return;
    const items = shelf.data.flatMap((i) => (i.expiresAt ? [{ id: i.id, name: i.name, expiresAt: i.expiresAt }] : []));
    void remindersAllowed(true)
      .then((allowed) =>
        allowed
          ? scheduleExpiryReminders(items, leadDays, {
              title: (count, days) => t('reminders.title', { count, days }),
              body: (names) => names.slice(0, 4).join(', ') + (names.length > 4 ? '…' : ''),
            })
          : undefined,
      )
      .catch(() => undefined);
  }, [signedIn, me.data, shelf.data, leadDays, t]);
}
