import { getClient, graphql, VariablesOf } from "./client";

const upsertSubscriptionMutation = graphql(`
  mutation upsertSubscription($object: push_subscriptions_insert_input!) {
    insert_push_subscriptions_one(
      object: $object
      on_conflict: {
        constraint: push_subscriptions_user_id_key
        update_columns: [subscription]
      }
    ) {
      id
    }
  }
`);

export type IPushSubscription = VariablesOf<
  typeof upsertSubscriptionMutation
>["object"];

export const upsertSubscription = async (object: IPushSubscription) => {
  try {
    const client = await getClient();

    const { data, error } = await client.mutation(upsertSubscriptionMutation, {
      object,
    });

    if (error) throw new Error(error.message);

    return data?.insert_push_subscriptions_one?.id;
  } catch (e) {
    console.error(e);
    return;
  }
};
