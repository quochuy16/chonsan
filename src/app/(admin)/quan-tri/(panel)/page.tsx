import Link from "next/link";
import { db } from "@/lib/server/db";
import { requireAdmin } from "@/lib/server/auth";
import { formatVND } from "@/lib/domain/money";
import { addDays, formatDateShort, formatDateTime, fromVN, todayKey, vnDateKey } from "@/lib/domain/time";
import { BarList } from "@/components/ui";
import { Metric, PageHeader, Panel, Pill } from "../_components/ui";

export const metadata = { title: { absolute: "Tổng quan · Quản trị ChonSan" } };

export default async function AdminDashboard() {
  await requireAdmin();
  const today = todayKey();
  const dayStart = fromVN(today, 0);
  const d7 = new Date(Date.now() - 7 * 86400_000);
  const from14 = addDays(today, -13);
  const from30 = fromVN(addDays(today, -29), 0);
  const [users, newUsers, venues, pendingVenues, bookingsToday, bookings14, gmv, matchedPosts, openPosts, openReports, latestUsers, pendingList, latestBookings] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: d7 } } }),
    db.venue.count({ where: { status: "APPROVED" } }),
    db.venue.count({ where: { status: "PENDING" } }),
    db.booking.count({ where: { status: { in: ["PENDING", "CONFIRMED", "COMPLETED"] }, start: { gte: dayStart, lt: fromVN(today, 1440) } } }),
    db.booking.findMany({ where: { status: { in: ["CONFIRMED", "COMPLETED"] }, start: { gte: fromVN(from14, 0), lt: fromVN(today, 1440) } }, select: { start: true } }),
    db.booking.aggregate({ _sum: { totalPrice: true }, where: { status: { in: ["CONFIRMED", "COMPLETED"] }, start: { gte: from30 } } }),
    db.matchPost.count({ where: { status: "MATCHED" } }),
    db.matchPost.count({ where: { status: "OPEN", start: { gt: new Date() } } }),
    db.report.count({ where: { status: "OPEN" } }),
    db.user.findMany({ orderBy: { createdAt: "desc" }, take: 6, select: { id: true, name: true, email: true, createdAt: true, googleId: true, role: true } }),
    db.venue.findMany({ where: { status: "PENDING" }, include: { owner: { select: { name: true } } }, orderBy: { createdAt: "asc" }, take: 5 }),
    db.booking.findMany({ orderBy: { createdAt: "desc" }, take: 6, include: { pitch: { include: { venue: { select: { name: true } } } } } }),
  ]);
  const perDay: Record<string, number> = {};
  for (const b of bookings14) perDay[vnDateKey(b.start)] = (perDay[vnDateKey(b.start)] ?? 0) + 1;
  const chart = Array.from({ length: 14 }, (_, i) => addDays(from14, i)).map((d) => ({ label: formatDateShort(d), value: perDay[d] ?? 0 }));

  return (
    <>
      <PageHeader title="Tổng quan" desc={`Hôm nay ${formatDateShort(today)}`} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="Người dùng" value={users} hint={`+${newUsers} trong 7 ngày`} href="/quan-tri/nguoi-dung" />
        <Metric label="Sân hoạt động" value={venues} hint={pendingVenues ? `${pendingVenues} sân chờ duyệt` : "Không có sân chờ duyệt"} href="/quan-tri/san" />
        <Metric label="Đơn hôm nay" value={bookingsToday} href="/quan-tri/dat-san" />
        <Metric label="Giá trị đặt sân 30 ngày" value={formatVND(gmv._sum.totalPrice ?? 0)} hint="Tiền khách trả thẳng cho chủ sân" />
        <Metric label="Kèo đã chốt" value={matchedPosts} href="/quan-tri/keo?status=MATCHED" />
        <Metric label="Kèo đang mở" value={openPosts} href="/quan-tri/keo" />
        <Metric label="Báo cáo chờ xử lý" value={openReports} href="/quan-tri/bao-cao" />
        <Metric label="Lượt đặt 14 ngày" value={bookings14.length} />
      </div>
      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2"><Panel title="Lượt đặt sân theo ngày (14 ngày)"><BarList rows={chart} format={(n) => `${n} đơn`} /></Panel></div>
        <div className="space-y-5">
          <Panel title="Sân chờ duyệt" action={<Link href="/quan-tri/san?status=PENDING" className="text-xs font-semibold text-slate-600 hover:underline">Xem tất cả</Link>}>
            {pendingList.length === 0 ? <p className="text-sm text-slate-500">Không có.</p> : (
              <ul className="space-y-2 text-sm">{pendingList.map((v) => <li key={v.id}><p className="font-medium">{v.name}</p><p className="text-xs text-slate-500">{v.owner.name} · {v.district}</p></li>)}</ul>
            )}
          </Panel>
          <Panel title="Người dùng mới">
            <ul className="space-y-2 text-sm">
              {latestUsers.map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-2">
                  <Link href={`/quan-tri/nguoi-dung/${u.id}`} className="min-w-0 truncate hover:underline">{u.name} <span className="text-xs text-slate-400">{u.email}</span></Link>
                  <span className="shrink-0">{u.googleId && <Pill tone="blue">Google</Pill>} {u.role === "ADMIN" && <Pill tone="amber">Admin</Pill>}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
      <div className="mt-5">
        <Panel title="Đơn đặt sân mới nhất" action={<Link href="/quan-tri/dat-san" className="text-xs font-semibold text-slate-600 hover:underline">Xem tất cả</Link>}>
          <ul className="divide-y divide-slate-100 text-sm">
            {latestBookings.map((b) => (
              <li key={b.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span><span className="font-mono text-xs text-slate-500">{b.code}</span> · {b.pitch.venue.name} · {b.pitch.name} · {formatDateTime(b.start)}</span>
                <span className="text-slate-600">{b.customerName} · {formatVND(b.totalPrice)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
