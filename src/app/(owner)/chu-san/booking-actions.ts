"use server";
import { db } from "@/lib/server/db";
import { requireOwnerUser } from "@/lib/server/auth";
import { getVenueAccess } from "@/lib/server/permissions";
import { BookingError, createBookingTx, quoteForPitch, type NewBooking } from "@/lib/server/booking";
import { done, fail, int, str } from "@/lib/server/flash";
import { notify } from "@/lib/server/notify";
import type { BookingStatus } from "@/lib/domain/constants";
import { depositFor } from "@/lib/domain/pricing";
import { canTransition } from "@/lib/domain/schedule";
import { addDays, formatDateTime, fromVN, hhmmToMinutes, isDateKey } from "@/lib/domain/time";
import { isValidPhone, normalizePhone, randomCode } from "@/lib/domain/text";

async function staffAccess(venueId: string, back: string) {
  const user = await requireOwnerUser(back);
  const access = await getVenueAccess(venueId, user);
  if (!access) fail("/chu-san", "Bạn không có quyền với sân này");
  return { user, venue: access.venue };
}

const MESSAGES: Partial<Record<BookingStatus, [string, string]>> = {
  CONFIRMED: ["Đã xác nhận đơn", "Chủ sân đã xác nhận đơn đặt sân của bạn ✅"],
  CANCELLED: ["Đã hủy đơn", "Chủ sân đã hủy đơn đặt sân của bạn"],
  COMPLETED: ["Đã đánh dấu đá xong", "Cảm ơn bạn đã đá tại sân! Hãy để lại đánh giá nhé"],
  NO_SHOW: ["Đã đánh dấu khách bùng", "Đơn của bạn bị đánh dấu không đến sân"],
};

export async function setBookingStatusAction(venueId: string, bookingId: string, to: BookingStatus, form: FormData) {
  const back = str(form, "back") || `/chu-san/${venueId}`;
  await staffAccess(venueId, back);
  const b = await db.booking.findFirst({ where: { id: bookingId, pitch: { venueId } }, include: { pitch: true } });
  if (!b) fail(back, "Không tìm thấy đơn");
  if (!canTransition(b.status, to)) fail(back, "Không thể chuyển trạng thái này");
  await db.booking.update({ where: { id: b.id }, data: { status: to, ...(to === "CANCELLED" ? { cancelledAt: new Date() } : {}) } });
  const msg = MESSAGES[to];
  if (msg && b.status !== "BLOCKED") await notify(b.userId, msg[1], `${b.pitch.name} · ${formatDateTime(b.start)}`, `/dat-san/${b.code}`);
  done(back, msg?.[0] ?? "Đã cập nhật");
}

export async function toggleDepositAction(venueId: string, bookingId: string, form: FormData) {
  const back = str(form, "back") || `/chu-san/${venueId}`;
  await staffAccess(venueId, back);
  const b = await db.booking.findFirst({ where: { id: bookingId, pitch: { venueId } } });
  if (!b) fail(back, "Không tìm thấy đơn");
  await db.booking.update({ where: { id: b.id }, data: { depositPaid: !b.depositPaid } });
  if (!b.depositPaid) await notify(b.userId, "Chủ sân đã nhận cọc", `Mã ${b.code}`, `/dat-san/${b.code}`);
  done(back, b.depositPaid ? "Đã bỏ đánh dấu cọc" : "Đã ghi nhận tiền cọc");
}

/** Đơn tay cho khách gọi điện, hoặc khóa giờ (bảo trì) */
export async function manualBookingAction(venueId: string, form: FormData) {
  const date = str(form, "date");
  const back = `/chu-san/${venueId}?date=${date}`;
  const { venue } = await staffAccess(venueId, back);
  const kind = str(form, "kind") === "BLOCK" ? "BLOCK" : "MANUAL";
  const pitchId = str(form, "pitchId");
  const startMin = hhmmToMinutes(str(form, "start"));
  const endMin = hhmmToMinutes(str(form, "end"));
  const weeks = Math.min(26, Math.max(1, int(form, "weeks", 1)));
  if (!isDateKey(date) || !(startMin < endMin) || startMin % 30 || endMin % 30) fail(back, "Giờ không hợp lệ");
  if (!(await db.pitch.findFirst({ where: { id: pitchId, venueId } }))) fail(back, "Sân con không hợp lệ");
  const name = kind === "BLOCK" ? str(form, "customerName") || "Khóa giờ" : str(form, "customerName");
  const phone = kind === "BLOCK" ? "" : normalizePhone(str(form, "customerPhone"));
  if (kind === "MANUAL" && (!name || !isValidPhone(phone))) fail(back, "Nhập tên và SĐT khách (10 số)");

  const recurringId = weeks > 1 ? `R${randomCode(8)}` : null;
  const items: NewBooking[] = [];
  for (let i = 0; i < weeks; i++) {
    const d = addDays(date, i * 7);
    let total = 0;
    if (kind === "MANUAL") {
      const custom = int(form, "price", -1);
      const { quote } = await quoteForPitch(pitchId, d, startMin, endMin);
      total = custom >= 0 && str(form, "price") ? custom : quote.ok ? quote.total : 0;
    }
    items.push({
      pitchId, customerName: name, customerPhone: phone, start: fromVN(d, startMin), end: fromVN(d, endMin),
      totalPrice: total, depositAmount: kind === "MANUAL" ? depositFor(total, venue.depositType, venue.depositValue) : 0,
      status: kind === "BLOCK" ? "BLOCKED" : "CONFIRMED", source: kind, note: str(form, "note").slice(0, 200),
      recurringId, userId: null,
    });
  }
  try {
    await createBookingTx(items);
  } catch (e) {
    if (e instanceof BookingError) fail(back, e.message);
    throw e;
  }
  done(back, kind === "BLOCK" ? "Đã khóa giờ" : weeks > 1 ? `Đã thêm ${weeks} buổi cố định` : "Đã thêm đơn");
}
