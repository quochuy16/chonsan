import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { getVenueAccess } from "@/lib/server/permissions";
import { db } from "@/lib/server/db";
import { BOOKING_STATUS, label } from "@/lib/domain/constants";
import { toCSV } from "@/lib/domain/stats";
import { addDays, formatTime, fromVN, isDateKey, todayKey, vnDateKey } from "@/lib/domain/time";

export async function GET(req: Request, { params }: { params: Promise<{ venueId: string }> }) {
  const { venueId } = await params;
  const user = await getCurrentUser();
  const access = await getVenueAccess(venueId, user);
  if (!access?.isOwner) return new NextResponse("Forbidden", { status: 403 });
  const url = new URL(req.url);
  const to = isDateKey(url.searchParams.get("to") ?? "") ? url.searchParams.get("to")! : todayKey();
  const from = isDateKey(url.searchParams.get("from") ?? "") ? url.searchParams.get("from")! : addDays(to, -29);
  const bookings = await db.booking.findMany({
    where: { pitch: { venueId }, start: { gte: fromVN(from, 0), lt: fromVN(to, 1440) }, status: { not: "BLOCKED" } },
    include: { pitch: true }, orderBy: { start: "asc" },
  });
  const csv = toCSV([
    ["Mã", "Ngày", "Từ", "Đến", "Sân", "Khách", "SĐT", "Tổng tiền", "Cọc", "Đã nhận cọc", "Trạng thái", "Nguồn"],
    ...bookings.map((b) => [b.code, vnDateKey(b.start), formatTime(b.start), formatTime(b.end), b.pitch.name, b.customerName, b.customerPhone,
      b.totalPrice, b.depositAmount, b.depositPaid ? "Có" : "Không", label(BOOKING_STATUS, b.status), b.source === "ONLINE" ? "Online" : "Đơn tay"]),
  ]);
  return new NextResponse(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="chonsan-${from}-${to}.csv"` },
  });
}
