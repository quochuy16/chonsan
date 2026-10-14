"use server";
import { redirect } from "next/navigation";
import { db } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { BookingError, createBookingTx, quoteForPitch, type NewBooking } from "@/lib/server/booking";
import { fail, int, str } from "@/lib/server/flash";
import { notify } from "@/lib/server/notify";
import { depositFor } from "@/lib/domain/pricing";
import { addDays, formatDateShort, fromVN, isDateKey, minutesToHHMM } from "@/lib/domain/time";
import { randomCode } from "@/lib/domain/text";

export async function createBookingAction(slug: string, form: FormData) {
  const back = `/san/${slug}#dat-san`;
  const user = await requireUser(`/san/${slug}`);
  const pitchId = str(form, "pitchId");
  const date = str(form, "date");
  const startMin = int(form, "startMin", -1);
  const duration = int(form, "duration");
  const weeks = Math.min(12, Math.max(1, int(form, "weeks", 1)));

  const note = str(form, "note").slice(0, 200);

  const pitch = await db.pitch.findUnique({ where: { id: pitchId }, include: { venue: true } });
  if (!pitch || pitch.venue.slug !== slug || pitch.venue.status !== "APPROVED" || !pitch.active) fail(back, "Sân không hợp lệ");
  const venue = pitch.venue;
  if (!isDateKey(date)) fail(back, "Ngày không hợp lệ");
  if (startMin % 30 !== 0 || duration < 60 || duration > 240 || duration % 30 !== 0) fail(back, "Giờ đặt không hợp lệ");
  if (startMin < venue.openMin || startMin + duration > venue.closeMin)
    fail(back, `Sân mở ${minutesToHHMM(venue.openMin)}–${minutesToHHMM(venue.closeMin)}`);
  if (fromVN(date, startMin) <= new Date()) fail(back, "Không thể đặt giờ đã qua");


  const recurringId = weeks > 1 ? `R${randomCode(8)}` : null;
  const items: NewBooking[] = [];
  for (let i = 0; i < weeks; i++) {
    const d = addDays(date, i * 7);
    const { quote } = await quoteForPitch(pitchId, d, startMin, startMin + duration);
    if (!quote.ok) fail(back, `Chưa có giá cho ngày ${formatDateShort(d)} lúc ${minutesToHHMM(quote.unpricedAt ?? startMin)}`);
    items.push({
      pitchId, userId: user.id, customerName: user.name, customerPhone: user.phone,
      start: fromVN(d, startMin), end: fromVN(d, startMin + duration),
      totalPrice: quote.total, depositAmount: depositFor(quote.total, venue.depositType, venue.depositValue),
      status: venue.autoConfirm ? "CONFIRMED" : "PENDING", source: "ONLINE", note, recurringId,
    });
  }

  let created;
  try {
    created = await createBookingTx(items);
  } catch (e) {
    if (e instanceof BookingError) fail(back, e.message);
    throw e;
  }
  const first = created[0];
  const staff = await db.venueStaff.findMany({ where: { venueId: venue.id } });
  const msg = `${user.name} đặt ${pitch.name} ${minutesToHHMM(startMin)} ${formatDateShort(date)}${weeks > 1 ? ` (cố định ${weeks} tuần)` : ""}`;
  for (const uid of [venue.ownerId, ...staff.map((s) => s.userId)]) {
    await notify(uid, venue.autoConfirm ? "Có đơn đặt sân mới" : "Đơn đặt sân chờ xác nhận", msg, `/chu-san/${venue.id}?date=${date}`);
  }
  redirect(`/dat-san/${first.code}?ok=${encodeURIComponent(venue.autoConfirm ? "Đặt sân thành công!" : "Đã gửi yêu cầu, chờ chủ sân xác nhận")}`);
}

export async function reportVenueAction(slug: string, form: FormData) {
  const user = await requireUser(`/san/${slug}`);
  const venue = await db.venue.findUnique({ where: { slug } });
  if (!venue) fail("/san", "Không tìm thấy sân");
  await db.report.create({
    data: { reporterId: user.id, targetType: "VENUE", targetId: venue.id, reason: str(form, "reason") || "OTHER", detail: str(form, "detail").slice(0, 500) },
  });
  redirect(`/san/${slug}?ok=${encodeURIComponent("Đã gửi báo cáo, cảm ơn bạn")}`);
}
