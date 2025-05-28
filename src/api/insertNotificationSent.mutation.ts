import { getClient, graphql } from "./client";

const insertSent = graphql(`
  mutation insertSent($user_id: String!, $event_id: uuid!) {
    insert_notifications_sent_one(
      object: { user_id: $user_id, event_id: $event_id }
    ) {
      user_id
      event_id
    }
  }
`);

export async function insertNotificationSent({
  user_id,
  event_id,
}: {
  user_id: string;
  event_id: string;
}) {
  const client = await getClient();
  await client.mutation(insertSent, { user_id, event_id });
}
