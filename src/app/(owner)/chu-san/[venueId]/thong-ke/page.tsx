import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/server/db";
import { requireOwnerUser } from "@/lib/server/auth";
import { getVenueAccess } from "@/lib/server/permissions";
import { formatVND } from "@/lib/domain/money";
import { occupancyByHour } from "@/lib/domain/stats";
import { addDays, formatDateShort, fromVN, todayKey, vnDateKey, vnParts } from "@/lib/domain/time";
import { BarList, StatCard } from "@/components/ui";

const RANGES = { "7": "7 ngày", "30": "30 ngày", "90": "90 ngày" } as const;

export default async function StatsPage({ params, searchParams }: { params: Promise<{ venueId: string }>; searchParams: Promise<{ range?: string }> }) {
  const { venueId } = await params;
  const sp = await searchParams;
  const user = await requireOwnerUser(`/chu-san/${venueId}/thong-ke`);
  const access = await getVenueAccess(venueId, user);
  if (!access?.isOwner) notFound();
  const days = sp.range && sp.range in RANGES ? Number(sp.range) : 30;
  const to = todayKey();
  const from = addDays(to, -(days - 1));
  const venue = await db.venue.findUniqueOrThrow({ where: { id: venueId }, include: { pitches: { where: { active: true } } } });
  const bookings = await db.booking.findMany({
    where: { pitch: { venueId }, start: { gte: fromVN(from, 0), lt: fromVN(to, 1440) }, status: { not: "BLOCKED" } },
    include: { pitch: true },
  });
  const played = bookings.filter((b) => ["CONFIRMED", "COMPLETED"].includes(b.status));
  const revenue = played.reduce((s, b) => s + b.totalPrice, 0);
  const noShows = bookings.filter((b) => b.status === "NO_SHOW").length;
  const cancelled = bookings.filter((b) => b.status === "CANCELLED").length;
  const online = played.filter((b) => b.source === "ONLINE").length;

  const byDay: Record<string, number> = {};
  for (const b of played) byDay[vnDateKey(b.start)] = (byDay[vnDateKey(b.start)] ?? 0) + b.totalPrice;
  const byPitch: Record<string, number> = {};
  for (const b of played) byPitch[b.pitch.name] = (byPitch[b.pitch.name] ?? 0) + b.totalPrice;
  const occupancy = occupancyByHour(
    [...played, ...bookings.filter((b) => b.status === "NO_SHOW")].map((b) => ({ startMin: vnParts(b.start).minutes, endMin: vnParts(b.start).minutes + (b.end.getTime() - b.start.getTime()) / 60000 })),
    venue.openMin, venue.closeMin, venue.pitches.length * days,
  );
  const customers: Record<string, { name: string; phone: string; count: number; total: number; noShow: number }> = {};
  for (const b of bookings) {
    if (!b.customerPhone) continue;
    const c = (customers[b.customerPhone] ??= { name: b.customerName, phone: b.customerPhone, count: 0, total: 0, noShow: 0 });
    if (["CONFIRMED", "COMPLETED"].includes(b.status)) { c.count++; c.total += b.totalPrice; }
    if (b.status === "NO_SHOW") c.noShow++;
  }
  const topCustomers = Object.values(customers).sort((a, b) => b.count - a.count).slice(0, 10);
  const dayRows = Array.from({ length: Math.min(days, 31) }, (_, i) => addDays(to, -i)).reverse().map((d) => ({ label: formatDateShort(d), value: byDay[d] ?? 0 }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {Object.entries(RANGES).map(([k, v]) => <Link key={k} href={`?range=${k}`} className={String(days) === k ? "btn-primary btn-sm" : "btn-secondary btn-sm"}>{v}</Link>)}
        <a href={`/chu-san/${venueId}/xuat-csv?from=${from}&to=${to}`} className="btn-secondary btn-sm ml-auto">⬇ Xuất Excel (CSV)</a>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Doanh thu" value={formatVND(revenue)} hint={`${formatDateShort(from)} – ${formatDateShort(to)}`} />
        <StatCard label="Lượt đặt" value={played.length} hint={`${online} online · ${played.length - online} đơn tay`} />
        <StatCard label="Tỉ lệ bùng" value={`${bookings.length ? Math.round((noShows / bookings.length) * 100) : 0}%`} hint={`${noShows} lượt bùng`} />
        <StatCard label="Đơn bị hủy" value={cancelled} />
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="card"><h2 className="h2 mb-3">Doanh thu theo ngày</h2><BarList rows={dayRows} format={formatVND} /></section>
        <div className="space-y-5">
          <section className="card"><h2 className="h2 mb-3">Tỉ lệ lấp sân theo giờ</h2>
            <p className="muted mb-2">Giờ thấp là giờ nên đăng giảm giá.</p>
            <BarList rows={occupancy.map((o) => ({ label: `${o.hour}h`, value: Math.round(o.rate * 100) }))} format={(n) => `${n}%`} /></section>
          <section className="card"><h2 className="h2 mb-3">Theo sân con</h2>
            <BarList rows={Object.entries(byPitch).map(([label, value]) => ({ label, value }))} format={formatVND} /></section>
        </div>
      </div>
      <section className="card">
        <h2 className="h2 mb-3">Khách quen</h2>
        <div className="overflow-x-auto"><table className="table">
          <thead><tr><th>Khách</th><th>SĐT</th><th className="text-right">Số lần</th><th className="text-right">Tổng chi</th><th className="text-right">Bùng</th></tr></thead>
          <tbody>{topCustomers.map((c) => <tr key={c.phone}><td>{c.name}</td><td>{c.phone}</td><td className="text-right">{c.count}</td><td className="text-right">{formatVND(c.total)}</td><td className={`text-right ${c.noShow ? "text-red-600" : ""}`}>{c.noShow}</td></tr>)}</tbody>
        </table></div>
      </section>
    </div>
  );
}
