// Ở local (không có cron), tự chạy việc định kỳ mỗi 5 phút ngay trong tiến trình Next.js.
// Khi deploy serverless (Vercel), đặt CRON_SECRET và cấu hình cron gọi GET /api/jobs.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.VERCEL || process.env.DISABLE_LOCAL_JOBS) return;
  const { runScheduledJobs } = await import("./lib/server/jobs");
  const tick = () =>
    runScheduledJobs()
      .then((r) => { if (r.expired || r.bookingReminders) console.log("[jobs]", r); })
      .catch((e) => console.error("[jobs]", e));
  setTimeout(tick, 10_000);
  setInterval(tick, 5 * 60_000);
}
