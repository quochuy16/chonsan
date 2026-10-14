import { NextResponse } from "next/server";
import { runScheduledJobs } from "@/lib/server/jobs";

/** Cho dịch vụ cron bên ngoài (vd Vercel Cron) gọi: Authorization: Bearer $CRON_SECRET */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await runScheduledJobs());
}
