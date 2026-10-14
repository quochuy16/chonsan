import { db } from "./db";

export async function notify(userId: string | null | undefined, title: string, body = "", link?: string) {
  if (!userId) return;
  await db.notification.create({ data: { userId, title, body, link } });
}
