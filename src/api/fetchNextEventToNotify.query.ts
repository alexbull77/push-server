import { getClient, graphql } from "./client";
import { differenceInMinutes } from "date-fns";
import { parse } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

const MOLDOVA_TIMEZONE = "Europe/Chisinau";

const fetchEventsQuery = graphql(`
  query fetchEvents($user_id: String) {
    event(where: { user_id: { _eq: $user_id } }) {
      id
      start
      title
    }
  }
`);

const fetchSentNotifications = graphql(`
  query fetchSent($user_id: String!) {
    notifications_sent(where: { user_id: { _eq: $user_id } }) {
      event_id
    }
  }
`);

export const fetchNextEventToNotify = async (user_id: string) => {
  const client = await getClient();

  // Convert server's current UTC time to Moldova time
  const nowUtc = new Date();
  const nowInMoldova = toZonedTime(nowUtc, MOLDOVA_TIMEZONE);

  const [eventsRes, sentRes] = await Promise.all([
    client.query(fetchEventsQuery, { user_id }),
    client.query(fetchSentNotifications, { user_id }),
  ]);

  const sentEventIds = new Set(
    sentRes.data?.notifications_sent.map((n) => n.event_id)
  );

  const eventToNotify = (eventsRes.data?.event || []).find((event) => {
    // Parse event time as Moldova local time
    const parsed = parse(event.start, "yyyy-MM-dd HH:mm", nowInMoldova);
    const eventTimeUtc = fromZonedTime(parsed, MOLDOVA_TIMEZONE);
    const minutes = differenceInMinutes(eventTimeUtc, nowUtc);

    return !sentEventIds.has(event.id) && minutes >= 5 && minutes <= 20;
  });

  return eventToNotify
    ? {
        ...eventToNotify,
        parsedStart: fromZonedTime(
          parse(eventToNotify.start, "yyyy-MM-dd HH:mm", nowInMoldova),
          MOLDOVA_TIMEZONE
        ),
      }
    : null;
};
