import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { OCCUPYING_STATUSES } from "@/lib/domain/constants";
import { parseDays, quote, type DealInput } from "@/lib/domain/pricing";
import { conflictingPitchIds } from "@/lib/domain/schedule";
import { formatDateTime, fromVN, vnParts } from "@/lib/domain/time";
import { randomCode } from "@/lib/domain/text";

export class BookingError extends Error {}

/** Báo giá cho sân con trong một ngày VN */
export async function quoteForPitch(pitchId: string, dateKey: string, startMin: number, endMin: number) {
  const pitch = await db.pitch.findUnique({
    where: { id: pitchId },
    include: { venue: { include: { priceRules: true, holidays: true } } },
  });
  if (!pitch) throw new BookingError("Không tìm thấy sân");
  const dayStart = fromVN(dateKey, 0);
  const dayEnd = fromVN(dateKey, 1440);
  const deals = await db.deal.findMany({
    where: { venueId: pitch.venueId, start: { lt: dayEnd }, end: { gt: dayStart } },
  });
  const holiday = pitch.venue.holidays.find((h) => h.date === dateKey);
  const dealInputs: DealInput[] = deals.map((d) => ({
    startMin: Math.max(0, Math.round((d.start.getTime() - dayStart.getTime()) / 60000)),
    endMin: Math.min(1440, Math.round((d.end.getTime() - dayStart.getTime()) / 60000)),
    percent: d.percent,
  }));
  const q = quote({
    rules: pitch.venue.priceRules.map((r) => ({ ...r, daysOfWeek: parseDays(r.daysOfWeek) })),
    pitchId,
    dow: vnParts(dayStart).dow,
    startMin,
    endMin,
    holidayPercent: holiday?.percent,
    deals: dealInputs,
  });
  return { pitch, venue: pitch.venue, quote: q, holiday };
}

export async function findConflict(
  tx: Prisma.TransactionClient,
  pitchId: string,
  start: Date,
  end: Date,
  excludeId?: string,
) {
  const pitch = await tx.pitch.findUnique({ where: { id: pitchId }, select: { venueId: true } });
  if (!pitch) throw new BookingError("Không tìm thấy sân");
  const links = await tx.pitchLink.findMany({ where: { parent: { venueId: pitch.venueId } } });
  const ids = conflictingPitchIds(pitchId, links);
  return tx.booking.findFirst({
    where: {
      pitchId: { in: ids },
      status: { in: OCCUPYING_STATUSES },
      start: { lt: end },
      end: { gt: start },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    include: { pitch: true },
  });
}

export type NewBooking = Omit<Prisma.BookingUncheckedCreateInput, "code" | "id">;

/**
 * MỌI đơn đặt sân / khóa giờ phải tạo qua hàm này: kiểm tra trùng lịch (kể cả sân ghép)
 * và ghi trong cùng một transaction. SQLite khóa ghi toàn DB nên không có race;
 * khi chuyển PostgreSQL cần thêm exclusion constraint (xem requirement.md §8).
 */
export async function createBookingTx(data: NewBooking | NewBooking[]) {
  const items = Array.isArray(data) ? data : [data];
  return db.$transaction(async (tx) => {
    const created = [];
    for (const item of items) {
      const start = new Date(item.start);
      const end = new Date(item.end);
      if (!(start < end)) throw new BookingError("Giờ kết thúc phải sau giờ bắt đầu");
      const conflict = await findConflict(tx, item.pitchId, start, end);
      if (conflict) {
        throw new BookingError(
          `${conflict.pitch.name} đã có lịch lúc ${formatDateTime(conflict.start)}, vui lòng chọn giờ khác`,
        );
      }
      created.push(await tx.booking.create({ data: { ...item, code: `CS${randomCode(6)}` } }));
    }
    return created;
  });
}

/** Các đơn chiếm chỗ trong một ngày của cụm sân */
export async function bookingsForDay(venueId: string, dateKey: string) {
  return db.booking.findMany({
    where: {
      pitch: { venueId },
      status: { in: OCCUPYING_STATUSES },
      start: { lt: fromVN(dateKey, 1440) },
      end: { gt: fromVN(dateKey, 0) },
    },
    orderBy: { start: "asc" },
  });
}

/** Tự đánh dấu "đã đá xong" các đơn đã qua giờ (gọi khi mở trang, thay cho cron ở bản local) */
export async function completePastBookings() {
  await db.booking.updateMany({
    where: { status: "CONFIRMED", end: { lt: new Date() } },
    data: { status: "COMPLETED" },
  });
}
