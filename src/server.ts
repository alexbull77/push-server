import express, { Request, Response } from "express";
import webpush from "web-push";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { upsertSubscription } from "./api/upsertSubscription.mutation";
import cron from "node-cron";
import fetch from "node-fetch";

dotenv.config();

const PUBLIC_VAPID_KEY = process.env.VAPID_PUBLIC_KEY!;
const PRIVATE_VAPID_KEY = process.env.VAPID_PRIVATE_KEY!;
const VAPID_EMAIL = process.env.VAPID_EMAIL!;
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL!;

webpush.setVapidDetails(
  `mailto:${VAPID_EMAIL}`,
  PUBLIC_VAPID_KEY,
  PRIVATE_VAPID_KEY
);

const app = express();

app.use(cors());
app.use(bodyParser.json());

import { fetchPushSubscriptions } from "./api/fetchPushSubscriptions.query";
import { differenceInMinutes } from "date-fns";
import { fetchNextEventToNotify } from "./api/fetchNextEventToNotify.query";
import { insertNotificationSent } from "./api/insertNotificationSent.mutation";

export async function sendReminders() {
  const subscriptions = await fetchPushSubscriptions();

  for (const sub of subscriptions) {
    const event = await fetchNextEventToNotify(sub.user_id);

    if (event) {
      const minutesUntil = differenceInMinutes(event.parsedStart, new Date());

      const payload = JSON.stringify({
        title: "📅 Upcoming Event",
        body: `Your event "${event.title}" starts in ${minutesUntil} minute${
          minutesUntil !== 1 ? "s" : ""
        }.`,
      });

      try {
        await webpush.sendNotification(
          JSON.parse(
            JSON.stringify(sub.subscription)
          ) as webpush.PushSubscription,
          payload
        );

        // Record sent notification
        await insertNotificationSent({
          user_id: sub.user_id,
          event_id: event.id,
        });

        console.log(`✅ Sent push for event ${event.id}`);
      } catch (err) {
        console.error("❌ Push failed:", err);
      }
    }
  }
}

app.post("/trigger-reminders", async (_, res) => {
  await sendReminders();
  res.json({ ok: true });
});

app.post("/subscribe", async (req: Request, res: Response): Promise<any> => {
  const { user_id, subscription } = req.body;

  if (!user_id || !subscription) {
    return res.status(400).json({ error: "user_id and subscription required" });
  }

  await upsertSubscription({ user_id, subscription });
  res.status(201).json({ message: "Subscription stored" });
});

app.post(
  "/send-notification",
  async (req: Request, res: Response): Promise<any> => {
    await fetch(`${BACKEND_BASE_URL}/trigger-reminders`, {
      method: "POST",
    });

    res.status(200).json({ message: "Successfully sent" });
  }
);

app.listen(PORT, () => {
  console.log(`Server running on ${BACKEND_BASE_URL}`);
});

cron.schedule("* * * * *", async () => {
  console.log("🔔 Running push reminder task...");

  try {
    const res = await fetch(`${BACKEND_BASE_URL}/trigger-reminders`, {
      method: "POST",
    });

    if (res.ok) {
      console.log("✅ Push reminder triggered successfully");
    } else {
      console.error("❌ Push reminder failed", await res.text());
    }
  } catch (err) {
    console.error("🚨 Cron job error:", err);
  }
});
