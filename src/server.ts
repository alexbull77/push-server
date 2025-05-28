import express, { Request, Response } from "express";
import webpush from "web-push";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";

dotenv.config();

const PUBLIC_VAPID_KEY = process.env.VAPID_PUBLIC_KEY!;
const PRIVATE_VAPID_KEY = process.env.VAPID_PRIVATE_KEY!;
const VAPID_EMAIL = process.env.VAPID_EMAIL!;
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

webpush.setVapidDetails(
  `mailto:${VAPID_EMAIL}`,
  PUBLIC_VAPID_KEY,
  PRIVATE_VAPID_KEY
);

const app = express();

app.use(cors());
app.use(bodyParser.json());

let clientSubscription: webpush.PushSubscription | null = null;

app.post("/subscribe", (req: Request, res: Response) => {
  clientSubscription = req.body;
  res.status(201).json({ message: "Subscription stored" });
});

app.post(
  "/send-notification",
  async (req: Request, res: Response): Promise<any> => {
    if (!clientSubscription) {
      return res.status(400).json({ error: "No subscription found" });
    }

    const payload = JSON.stringify({
      title: "🔔 Test Notification",
      body: "This is a push test!",
    });

    try {
      await webpush.sendNotification(clientSubscription, payload);
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error("Error sending notification:", err);
      return res.status(500).json({ error: "Push failed" });
    }
  }
);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
