import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/server/db";
import { requireAdmin } from "@/lib/server/auth";
import { Flash } from "@/components/flash";
import { BookingStatusBadge } from "@/components/ui";
import { BOOKING_STATUS } from "@/lib/domain/constants";
import { formatVND } from "@/lib/domain/money";
import { pageFrom, totalPages } from "@/lib/domain/pagination";
import { canTransition } from "@/lib/domain/schedule";
import { formatDateShort, formatTime, fromVN, isDateKey } from "@/lib/domain/time";
import { ActionButton } from "../../_components/admin-form";
import { DataTable, PageHeader, Pager, btnDanger, btnDark, currentUrl, filterInput } from "../../_components/ui";
import { adminCancelBookingAction } from "../../actions";

export const metadata = { title: "Đơn đặt sân" };
type SP = { q?: string; status?: string; venue?: string; from?: string; to?: string; page?: string; ok?: string; error?: string };

export default async function BookingsAdmin({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdmin("/quan-tri/dat-san");
  const sp = await searchParams;
  const { page, skip, take } = pageFrom(sp.page);
  const where: Prisma.BookingWhereInput = {
    ...(sp.q ? { OR: [{ code: { contains: sp.q.toUpperCase() } }, { customerName: { contains: sp.q } }, { customerPhone: { contains: sp.q } }] } : {}),
    ...(sp.status && sp.status in BOOKING_STATUS ? { status: sp.status } : {}),
    ...(sp.venue ? { pitch: { venueId: sp.venue } } : {}),
    ...(isDateKey(sp.from ?? "") || isDateKey(sp.to ?? "")
      ? { start: { ...(isDateKey(sp.from ?? "") ? { gte: fromVN(sp.from!, 0) } : {}), ...(isDateKey(sp.to ?? "") ? { lt: fromVN(sp.to!, 1440) } : {}) } }
      : {}),
  };
  const [total, sum, bookings, venues] = await Promise.all([
    db.booking.count({ where }),
    db.booking.aggregate({ where: { ...where, status: { in: ["CONFIRMED", "COMPLETED"] } }, _sum: { totalPrice: true } }),
    db.booking.findMany({ where, skip, take, orderBy: { start: "desc" }, include: { pitch: { include: { venue: { select: { id: true, name: true } } } } } }),
    db.venue.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const back = currentUrl("/quan-tri/dat-san", sp);
  return (
    <>
      <PageHeader title="Đơn đặt sân" desc={`Giá trị đơn đã xác nhận / đã đá trong bộ lọc: ${formatVND(sum._sum.totalPrice ?? 0)}`} />
      <Flash searchParams={sp} />
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q} placeholder="Mã đơn, tên khách, SĐT…" className={`${filterInput} min-w-48 flex-1`} aria-label="Tìm kiếm" />
        <select name="status" defaultValue={sp.status ?? ""} className={filterInput} aria-label="Trạng thái"><option value="">Mọi trạng thái</option>{Object.entries(BOOKING_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select name="venue" defaultValue={sp.venue ?? ""} className={`${filterInput} max-w-56`} aria-label="Sân"><option value="">Mọi sân</option>{venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select>
        <label className="flex items-center gap-1 text-sm text-slate-500">Từ <input type="date" name="from" defaultValue={sp.from} className={filterInput} /></label>
        <label className="flex items-center gap-1 text-sm text-slate-500">đến <input type="date" name="to" defaultValue={sp.to} className={filterInput} /></label>
        <button className={btnDark}>Lọc</button>
        <Link href="/quan-tri/dat-san" className="self-center text-sm text-slate-500 hover:underline">Xóa lọc</Link>
      </form>
      <DataTable head={["Mã", "Giờ đá", "Sân", "Khách", "Tiền", "Nguồn", "Trạng thái", ""]} empty={bookings.length === 0}>
        {bookings.map((b) => (
          <tr key={b.id} className="hover:bg-slate-50">
            <td className="px-3 py-2.5 font-mono text-xs"><Link href={`/dat-san/${b.code}`} target="_blank" className="hover:underline">{b.code}</Link></td>
            <td className="px-3 py-2.5 whitespace-nowrap">{formatTime(b.start)}–{formatTime(b.end)}<p className="text-xs text-slate-500">{formatDateShort(b.start)}</p></td>
            <td className="px-3 py-2.5">{b.pitch.venue.name}<p className="text-xs text-slate-500">{b.pitch.name}</p></td>
            <td className="px-3 py-2.5">{b.status === "BLOCKED" ? <span className="text-slate-500">{b.customerName}</span> : <>{b.userId ? <Link href={`/quan-tri/nguoi-dung/${b.userId}`} className="hover:underline">{b.customerName}</Link> : b.customerName}<p className="text-xs text-slate-500">{b.customerPhone}</p></>}</td>
            <td className="px-3 py-2.5 whitespace-nowrap tabular-nums">{formatVND(b.totalPrice)}{b.depositAmount > 0 && <p className="text-xs text-slate-500">cọc {formatVND(b.depositAmount)} {b.depositPaid ? "✅" : "⏳"}</p>}</td>
            <td className="px-3 py-2.5 text-xs">{b.source === "ONLINE" ? "Online" : b.source === "MANUAL" ? "Đơn tay" : "Khóa giờ"}</td>
            <td className="px-3 py-2.5"><BookingStatusBadge status={b.status} /></td>
            <td className="px-3 py-2.5 text-right">{canTransition(b.status, "CANCELLED") && <ActionButton action={adminCancelBookingAction.bind(null, b.id)} back={back} label="Hủy" className={btnDanger} confirm={`Hủy đơn ${b.code}? Khách và chủ sân sẽ nhận thông báo.`} />}</td>
          </tr>
        ))}
      </DataTable>
      <Pager base="/quan-tri/dat-san" params={sp} page={page} pages={totalPages(total)} total={total} />
    </>
  );
}
