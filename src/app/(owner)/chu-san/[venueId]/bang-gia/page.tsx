import { notFound } from "next/navigation";
import { db } from "@/lib/server/db";
import { requireOwnerUser } from "@/lib/server/auth";
import { getVenueAccess } from "@/lib/server/permissions";
import { formatDays, parseDays } from "@/lib/domain/pricing";
import { formatVND } from "@/lib/domain/money";
import { addDays, formatDateShort, formatTime, minutesToHHMM, todayKey } from "@/lib/domain/time";
import { Flash } from "@/components/flash";
import { Badge } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { addDealAction, addHolidayAction, addPriceRuleAction, deleteDealAction, deleteHolidayAction, deletePriceRuleAction } from "../../pricing-actions";

const DAYS = [[1, "T2"], [2, "T3"], [3, "T4"], [4, "T5"], [5, "T6"], [6, "T7"], [0, "CN"]] as const;

export default async function PricingPage({ params, searchParams }: { params: Promise<{ venueId: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { venueId } = await params;
  const sp = await searchParams;
  const user = await requireOwnerUser(`/chu-san/${venueId}/bang-gia`);
  const access = await getVenueAccess(venueId, user);
  if (!access?.isOwner) notFound();
  const venue = await db.venue.findUniqueOrThrow({
    where: { id: venueId },
    include: { pitches: { orderBy: { sortOrder: "asc" } }, priceRules: { orderBy: [{ pitchId: "asc" }, { startMin: "asc" }] }, holidays: { orderBy: { date: "asc" } }, deals: { where: { end: { gt: new Date() } }, orderBy: { start: "asc" } } },
  });
  const pitchName = (id: string | null) => (id ? venue.pitches.find((p) => p.id === id)?.name : "Tất cả sân");
  const today = todayKey();
  return (
    <div className="space-y-5">
      <Flash searchParams={sp} />
      <section className="card">
        <h2 className="h2 mb-1">Bảng giá theo khung giờ</h2>
        <p className="muted mb-3">Giá cho riêng một sân con được ưu tiên hơn giá &quot;Tất cả sân&quot;. Khung giờ không có giá thì khách không đặt online được.</p>
        <div className="overflow-x-auto">
          <table className="table mb-4">
            <thead><tr><th>Áp dụng</th><th>Ngày</th><th>Khung giờ</th><th className="text-right">Giá/giờ</th><th /></tr></thead>
            <tbody>
              {venue.priceRules.map((r) => (
                <tr key={r.id}>
                  <td>{pitchName(r.pitchId)}</td><td>{formatDays(parseDays(r.daysOfWeek))}</td><td>{minutesToHHMM(r.startMin)}–{minutesToHHMM(r.endMin)}</td>
                  <td className="text-right font-semibold">{formatVND(r.pricePerHour)}</td>
                  <td className="text-right"><form action={deletePriceRuleAction.bind(null, venueId, r.id)}><SubmitButton className="btn-ghost btn-sm text-red-600">Xóa</SubmitButton></form></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form action={addPriceRuleAction.bind(null, venueId)} className="grid grid-cols-1 gap-3 rounded-xl bg-gray-50 p-3 md:grid-cols-6">
          <select name="pitchId" className="input md:col-span-2" aria-label="Áp dụng cho"><option value="">Tất cả sân</option>{venue.pitches.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.size})</option>)}</select>
          <div className="flex flex-wrap items-center gap-2 md:col-span-4">
            {DAYS.map(([d, l]) => <label key={d} className="flex items-center gap-1 text-sm"><input type="checkbox" name="days" value={d} defaultChecked={d >= 1 && d <= 5} /> {l}</label>)}
          </div>
          <input name="start" type="time" step={1800} defaultValue="17:00" className="input md:col-span-1" aria-label="Từ giờ" />
          <input name="end" type="time" step={1800} defaultValue="22:00" className="input md:col-span-1" aria-label="Đến giờ" />
          <input name="price" className="input md:col-span-2" placeholder="Giá/giờ, VD 500000" inputMode="numeric" aria-label="Giá mỗi giờ" required />
          <SubmitButton className="btn-primary md:col-span-2">+ Thêm khung giá</SubmitButton>
        </form>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="card">
          <h2 className="h2 mb-1">Giá ngày lễ</h2>
          <p className="muted mb-3">Nhân % trên toàn bộ bảng giá ngày đó (VD Tết 150%).</p>
          <ul className="mb-3 divide-y divide-gray-100 text-sm">
            {venue.holidays.map((h) => (
              <li key={h.id} className="flex items-center justify-between py-2"><span>{formatDateShort(h.date)} {h.name && `· ${h.name}`} · <strong>{h.percent}%</strong></span>
                <form action={deleteHolidayAction.bind(null, venueId, h.id)}><SubmitButton className="btn-ghost btn-sm">Xóa</SubmitButton></form></li>
            ))}
          </ul>
          <form action={addHolidayAction.bind(null, venueId)} className="grid grid-cols-2 gap-2">
            <input name="date" type="date" min={today} className="input" required aria-label="Ngày" />
            <input name="percent" type="number" defaultValue={130} min={50} max={300} className="input" aria-label="Phần trăm" />
            <input name="name" className="input" placeholder="Tên, VD: Quốc khánh" aria-label="Tên ngày lễ" />
            <SubmitButton className="btn-secondary">Lưu</SubmitButton>
          </form>
        </section>
        <section className="card">
          <h2 className="h2 mb-1">Giờ trống giảm giá {venue.plan !== "PRO" && <Badge tone="blue">Pro</Badge>}</h2>
          <p className="muted mb-3">Đăng nhanh khung giờ ế để lấp sân. Hiển thị nổi bật trên trang sân.</p>
          <ul className="mb-3 divide-y divide-gray-100 text-sm">
            {venue.deals.map((d) => (
              <li key={d.id} className="flex items-center justify-between py-2"><span>{formatDateShort(d.start)} · {formatTime(d.start)}–{formatTime(d.end)} · <strong>-{d.percent}%</strong></span>
                <form action={deleteDealAction.bind(null, venueId, d.id)}><SubmitButton className="btn-ghost btn-sm">Gỡ</SubmitButton></form></li>
            ))}
          </ul>
          <form action={addDealAction.bind(null, venueId)} className="grid grid-cols-2 gap-2">
            <select name="date" className="input" aria-label="Ngày">{Array.from({ length: 7 }, (_, i) => addDays(today, i)).map((d) => <option key={d} value={d}>{formatDateShort(d)}</option>)}</select>
            <input name="percent" type="number" defaultValue={20} min={5} max={70} className="input" aria-label="Giảm %" />
            <input name="start" type="time" step={1800} defaultValue="14:00" className="input" aria-label="Từ giờ" />
            <input name="end" type="time" step={1800} defaultValue="16:00" className="input" aria-label="Đến giờ" />
            <SubmitButton className="btn-secondary col-span-2">Đăng giảm giá</SubmitButton>
          </form>
        </section>
      </div>
    </div>
  );
}
