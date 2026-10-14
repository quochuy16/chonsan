import Link from "next/link";
import { db } from "@/lib/server/db";
import { bookingsForDay } from "@/lib/server/booking";
import { addDays, formatDateLong, isDateKey, minutesToHHMM, todayKey, vnDateKey, vnParts } from "@/lib/domain/time";
import { Flash } from "@/components/flash";
import { Empty } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { manualBookingAction } from "../booking-actions";
import { BookingRow } from "./booking-row";

const ROW = 26; // px mỗi 30 phút
const COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 border-amber-400 text-amber-900",
  CONFIRMED: "bg-brand-100 border-brand-500 text-brand-900",
  COMPLETED: "bg-gray-100 border-gray-400 text-gray-700",
  NO_SHOW: "bg-red-100 border-red-400 text-red-800",
  BLOCKED: "bg-slate-200 border-slate-400 text-slate-700",
};

export default async function CalendarPage({ params, searchParams }: { params: Promise<{ venueId: string }>; searchParams: Promise<{ date?: string; ok?: string; error?: string }> }) {
  const { venueId } = await params;
  const sp = await searchParams;
  const date = sp.date && isDateKey(sp.date) ? sp.date : todayKey();
  const venue = await db.venue.findUniqueOrThrow({ where: { id: venueId }, include: { pitches: { where: { active: true }, orderBy: { sortOrder: "asc" } } } });
  const [dayBookings, pending] = await Promise.all([
    bookingsForDay(venueId, date),
    db.booking.findMany({ where: { pitch: { venueId }, status: "PENDING" }, include: { pitch: true }, orderBy: { start: "asc" }, take: 30 }),
  ]);
  const pitchById = Object.fromEntries(venue.pitches.map((p) => [p.id, p]));
  const day = dayBookings.filter((b) => pitchById[b.pitchId]).map((b) => ({ ...b, pitch: pitchById[b.pitchId] }));
  const slots: number[] = [];
  for (let m = venue.openMin; m < venue.closeMin; m += 30) slots.push(m);
  const back = `/chu-san/${venueId}?date=${date}`;
  const minuteOf = (d: Date) => (vnDateKey(d) === date ? vnParts(d).minutes : vnDateKey(d) < date ? 0 : 1440);

  return (
    <div className="space-y-5">
      <Flash searchParams={sp} />
      {pending.length > 0 && (
        <section className="card border-amber-300">
          <h2 className="h2 mb-1">Chờ xác nhận ({pending.length})</h2>
          <ul className="divide-y divide-gray-100">{pending.map((b) => <BookingRow key={b.id} b={b} venueId={venueId} back={back} showDate />)}</ul>
        </section>
      )}

      <section className="card">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Link href={`/chu-san/${venueId}?date=${addDays(date, -1)}`} className="btn-secondary btn-sm">‹</Link>
          <Link href={`/chu-san/${venueId}`} className="btn-secondary btn-sm">Hôm nay</Link>
          <Link href={`/chu-san/${venueId}?date=${addDays(date, 1)}`} className="btn-secondary btn-sm">›</Link>
          <form className="flex gap-1"><input type="date" name="date" defaultValue={date} className="input py-1.5" /><button className="btn-secondary btn-sm">Xem</button></form>
          <h2 className="h2 ml-auto">{formatDateLong(date)}</h2>
        </div>
        {venue.pitches.length === 0 ? <Empty title="Chưa có sân con" action={{ href: `/chu-san/${venueId}/cai-dat`, label: "Thêm sân con" }} /> : (
          <div className="overflow-x-auto">
            <div className="flex min-w-max">
              <div className="w-12 shrink-0 pt-8">
                {slots.map((m) => <div key={m} style={{ height: ROW }} className="pr-1 text-right text-[10px] text-gray-400">{m % 60 === 0 ? minutesToHHMM(m) : ""}</div>)}
              </div>
              {venue.pitches.map((p) => (
                <div key={p.id} className="w-36 shrink-0 border-l border-gray-100 sm:w-44">
                  <div className="h-8 truncate px-2 text-center text-sm font-semibold">{p.name} <span className="text-xs font-normal text-gray-400">({p.size})</span></div>
                  <div className="relative" style={{ height: slots.length * ROW }}>
                    {slots.map((m) => <div key={m} style={{ height: ROW }} className={m % 60 === 0 ? "border-t border-gray-100" : "border-t border-dashed border-gray-50"} />)}
                    {day.filter((b) => b.pitchId === p.id).map((b) => {
                      const s = Math.max(minuteOf(b.start), venue.openMin), e = Math.min(minuteOf(b.end), venue.closeMin);
                      return (
                        <a key={b.id} href={`#b-${b.id}`} className={`absolute inset-x-1 overflow-hidden rounded-lg border-l-4 px-1.5 py-0.5 text-[11px] leading-tight ${COLORS[b.status] ?? ""}`}
                          style={{ top: ((s - venue.openMin) / 30) * ROW + 1, height: ((e - s) / 30) * ROW - 2 }}>
                          <strong>{minutesToHHMM(s)}–{minutesToHHMM(e)}</strong><br />{b.customerName}
                        </a>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <section className="card lg:col-span-2">
          <h2 className="h2 mb-1">Đơn trong ngày ({day.length})</h2>
          {day.length === 0 ? <p className="muted">Chưa có đơn nào.</p> : <ul className="divide-y divide-gray-100">{day.map((b) => <BookingRow key={b.id} b={b} venueId={venueId} back={back} />)}</ul>}
        </section>
        <section className="card">
          <h2 className="h2 mb-3">Thêm đơn / khóa giờ</h2>
          <form action={manualBookingAction.bind(null, venueId)} className="space-y-3">
            <input type="hidden" name="date" value={date} />
            <div className="flex gap-3 text-sm">
              <label className="flex items-center gap-1"><input type="radio" name="kind" value="MANUAL" defaultChecked /> Khách gọi điện</label>
              <label className="flex items-center gap-1"><input type="radio" name="kind" value="BLOCK" /> Khóa giờ</label>
            </div>
            <select name="pitchId" className="input" aria-label="Sân con">{venue.pitches.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="label" htmlFor="start">Từ</label><input id="start" name="start" type="time" step={1800} defaultValue="18:00" className="input" required /></div>
              <div><label className="label" htmlFor="end">Đến</label><input id="end" name="end" type="time" step={1800} defaultValue="19:30" className="input" required /></div>
            </div>
            <input name="customerName" className="input" placeholder="Tên khách (hoặc lý do khóa)" aria-label="Tên khách" />
            <input name="customerPhone" className="input" placeholder="SĐT khách" aria-label="SĐT khách" />
            <div className="grid grid-cols-2 gap-2">
              <input name="price" className="input" placeholder="Giá (bỏ trống = theo bảng)" aria-label="Giá" inputMode="numeric" />
              <select name="weeks" className="input" aria-label="Lặp"><option value="1">Một lần</option>{[4, 8, 12, 26].map((w) => <option key={w} value={w}>Cố định {w} tuần</option>)}</select>
            </div>
            <input name="note" className="input" placeholder="Ghi chú" aria-label="Ghi chú" />
            <SubmitButton className="btn-primary w-full">Lưu vào lịch</SubmitButton>
            <p className="text-xs text-gray-500">Hệ thống tự chặn nếu trùng giờ (kể cả sân ghép).</p>
          </form>
        </section>
      </div>
    </div>
  );
}
