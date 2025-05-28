import { getClient, graphql } from "./client";
import { differenceInMinutes, parse } from "date-fns";

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
  const now = new Date();
  const client = await getClient();

  const [eventsRes, sentRes] = await Promise.all([
    client.query(fetchEventsQuery, { user_id }),
    client.query(fetchSentNotifications, { user_id }),
  ]);

  const sentEventIds = new Set(
    sentRes.data?.notifications_sent.map((n) => n.event_id)
  );

  const eventToNotify = (eventsRes.data?.event || []).find((event) => {
    const parsed = parse(event.start, "yyyy-MM-dd HH:mm", now);
    const minutes = differenceInMinutes(parsed, now);
    return !sentEventIds.has(event.id) && minutes >= 10 && minutes <= 20;
  });

  return eventToNotify
    ? {
        ...eventToNotify,
        parsedStart: parse(eventToNotify.start, "yyyy-MM-dd HH:mm", now),
      }
    : null;
};
