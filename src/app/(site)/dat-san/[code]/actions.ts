"use server";
import { db } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { done, fail, int, str } from "@/lib/server/flash";
import { notify } from "@/lib/server/notify";
import { canCustomerCancel } from "@/lib/domain/schedule";
import { formatDateTime } from "@/lib/domain/time";

export async function cancelMyBookingAction(code: string, form: FormData) {
  const back = `/dat-san/${code}`;
  const user = await requireUser(back);
  const all = form.get("all") === "1";
  const booking = await db.booking.findUnique({ where: { code }, include: { pitch: { include: { venue: true } } } });
  if (!booking || booking.userId !== user.id) fail("/tai-khoan", "Không tìm thấy đơn");
  if (!["PENDING", "CONFIRMED"].includes(booking.status)) fail(back, "Đơn này không thể hủy");
  const venue = booking.pitch.venue;
  if (!canCustomerCancel(booking.start, venue.cancelHours)) {
    fail(back, `Chỉ được tự hủy trước ${venue.cancelHours} giờ. Vui lòng gọi chủ sân: ${venue.phone}`);
  }
  const where = all && booking.recurringId
    ? { recurringId: booking.recurringId, userId: user.id, status: { in: ["PENDING", "CONFIRMED"] }, start: { gte: booking.start } }
    : { id: booking.id };
  const res = await db.booking.updateMany({ where, data: { status: "CANCELLED", cancelledAt: new Date() } });
  await notify(venue.ownerId, "Khách đã hủy đặt sân", `${user.name} hủy ${booking.pitch.name} ${formatDateTime(booking.start)}${res.count > 1 ? ` và ${res.count - 1} buổi sau` : ""}`, `/chu-san/${venue.id}`);
  done(back, res.count > 1 ? `Đã hủy ${res.count} buổi` : "Đã hủy đơn");
}

export async function reviewAction(code: string, form: FormData) {
  const back = `/dat-san/${code}`;
  const user = await requireUser(back);
  const booking = await db.booking.findUnique({ where: { code }, include: { review: true, pitch: true } });
  if (!booking || booking.userId !== user.id) fail("/tai-khoan", "Không tìm thấy đơn");
  if (booking.status !== "COMPLETED") fail(back, "Chỉ đánh giá được sau khi đá xong");
  if (booking.review) fail(back, "Bạn đã đánh giá đơn này");
  const rating = Math.min(5, Math.max(1, int(form, "rating", 5)));
  await db.review.create({
    data: { bookingId: booking.id, userId: user.id, venueId: booking.pitch.venueId, rating, comment: str(form, "comment").slice(0, 500) },
  });
  done(back, "Cảm ơn bạn đã đánh giá!");
}
