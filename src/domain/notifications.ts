import { parseISO, subMinutes } from 'date-fns';
import * as Notifications from 'expo-notifications';

import type { Event } from '../types/models';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function cancelEventReminder(eventId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(eventId).catch(() => {});
}

/**
 * Cancels any existing reminder for this event, then reschedules one if the
 * event still wants it. Notification content is always just the event's own
 * user-authored title — never synthesized wording — so nothing outside the
 * app can reveal that this is a cycle-tracking app.
 */
export async function syncEventReminder(event: Event): Promise<void> {
  await cancelEventReminder(event.id);
  if (event.reminderMinutesBefore == null) return;

  const granted = await requestNotificationPermission();
  if (!granted) return;

  // Subtract on the full Date before reading out components, so the
  // reminder correctly rolls the calendar date backward when it crosses
  // midnight (e.g. a 00:10 Monday event with a 30-min reminder must fire
  // Sunday 23:40 — weekday Sunday, not Monday).
  const anchor = subMinutes(parseISO(event.startAt), event.reminderMinutesBefore);
  const hour = anchor.getHours();
  const minute = anchor.getMinutes();

  let trigger: Notifications.NotificationTriggerInput | null = null;

  if (!event.recurrenceRule) {
    trigger =
      anchor.getTime() > Date.now()
        ? { type: Notifications.SchedulableTriggerInputTypes.DATE, date: anchor }
        : null; // reminder time already passed — nothing to schedule
  } else {
    switch (event.recurrenceRule.freq) {
      case 'daily':
        trigger = { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute };
        break;
      case 'weekly':
        // weekday is 1-7, Sunday = 1 (native convention, NOT JS getDay()'s 0-6)
        trigger = {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: anchor.getDay() + 1,
          hour,
          minute,
        };
        break;
      case 'monthly':
        trigger = {
          type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
          day: anchor.getDate(),
          hour,
          minute,
        };
        break;
      case 'yearly':
        // month is 0-11 (JS Date convention) here — do NOT add 1. This is
        // the opposite indexing convention from `weekday` above.
        trigger = {
          type: Notifications.SchedulableTriggerInputTypes.YEARLY,
          day: anchor.getDate(),
          month: anchor.getMonth(),
          hour,
          minute,
        };
        break;
    }
  }

  if (!trigger) return;

  await Notifications.scheduleNotificationAsync({
    identifier: event.id,
    content: { title: event.title, sound: true },
    trigger,
  });
}
