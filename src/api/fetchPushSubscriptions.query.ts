import { getClient, graphql } from "./client";

const fetchPushSubscriptionsQuery = graphql(`
  query fetchEvents {
    push_subscriptions {
      id
      user_id
      subscription
    }
  }
`);

export const fetchPushSubscriptions = async () => {
  try {
    const client = await getClient();

    const { data, error } = await client.query(fetchPushSubscriptionsQuery, {});

    if (error) throw new Error(error.message);

    return data?.push_subscriptions || [];
  } catch (e) {
    console.error(e);
    return [];
  }
};
