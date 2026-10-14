import { db } from "./db";
import { notify } from "./notify";
import { completePastBookings } from "./booking";
import { isPendingExpired, isReminderDue, REMINDER_LEAD_MIN } from "@/lib/domain/schedule";
import { formatDateTime, formatTime } from "@/lib/domain/time";

export interface JobResult {
  expired: number;
  bookingReminders: number;
  eventReminders: number;
}

/**
 * Việc định kỳ (chạy mỗi vài phút): tự hủy đơn chờ quá hạn, đánh dấu đơn đã đá xong,
 * gửi thông báo nhắc giờ đá. An toàn khi chạy lặp lại (idempotent).
 */
export async function runScheduledJobs(now: Date = new Date()): Promise<JobResult> {
  // 1. Đơn chờ xác nhận quá hạn → hủy để nhả giờ cho người khác
  const pending = await db.booking.findMany({
    where: { status: "PENDING" },
    include: { pitch: { include: { venue: true } } },
  });
  let expired = 0;
  for (const b of pending) {
    if (!isPendingExpired(b.createdAt, b.start, now, b.pitch.venue.pendingExpireMin)) continue;
    const res = await db.booking.updateMany({ where: { id: b.id, status: "PENDING" }, data: { status: "CANCELLED", cancelledAt: now } });
    if (res.count === 0) continue; // chủ sân vừa xác nhận
    expired++;
    await notify(b.userId, "Đơn đặt sân đã tự hủy", `Chủ sân chưa xác nhận ${b.pitch.name} ${formatDateTime(b.start)}. Bạn có thể đặt sân khác.`, `/dat-san/${b.code}`);
  }

  // 2. Đơn đã qua giờ → đã đá xong
  await completePastBookings();

  // 3. Nhắc giờ đá cho người đặt
  const horizon = new Date(now.getTime() + REMINDER_LEAD_MIN * 60_000);
  const soon = await db.booking.findMany({
    where: { status: "CONFIRMED", reminderSentAt: null, userId: { not: null }, start: { gt: now, lte: horizon } },
    include: { pitch: { include: { venue: true } } },
  });
  let bookingReminders = 0;
  for (const b of soon) {
    if (!isReminderDue(b.start, now)) continue;
    const res = await db.booking.updateMany({ where: { id: b.id, reminderSentAt: null }, data: { reminderSentAt: now } });
    if (res.count === 0) continue;
    bookingReminders++;
    await notify(b.userId, `⏰ ${formatTime(b.start)} hôm nay: ${b.pitch.venue.name}`, `${b.pitch.name} · ${b.pitch.venue.address}`, `/dat-san/${b.code}`);
  }

  // 4. Nhắc buổi đá của đội (trừ người đã báo "Không đi")
  const events = await db.teamEvent.findMany({
    where: { finished: false, reminderSentAt: null, start: { gt: now, lte: horizon } },
    include: { team: true, attendances: true },
  });
  let eventReminders = 0;
  for (const e of events) {
    if (!isReminderDue(e.start, now)) continue;
    const res = await db.teamEvent.updateMany({ where: { id: e.id, reminderSentAt: null }, data: { reminderSentAt: now } });
    if (res.count === 0) continue;
    eventReminders++;
    const members = await db.teamMember.findMany({ where: { teamId: e.teamId, active: true, userId: { not: null } } });
    const declined = new Set(e.attendances.filter((a) => a.response === "NO").map((a) => a.memberId));
    for (const m of members) {
      if (declined.has(m.id)) continue;
      const answered = e.attendances.some((a) => a.memberId === m.id);
      await notify(m.userId, `⏰ ${e.team.name}: ${e.title} lúc ${formatTime(e.start)}`, answered ? e.venueText : `${e.venueText} · Bạn chưa điểm danh!`, `/doi/${e.team.slug}/lich`);
    }
  }
  return { expired, bookingReminders, eventReminders };
}
