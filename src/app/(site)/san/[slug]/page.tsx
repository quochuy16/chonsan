import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/server/db";
import { getCurrentUser } from "@/lib/server/auth";
import { bookingsForDay } from "@/lib/server/booking";
import { AMENITIES, PITCH_SIZES, REPORT_REASONS, SURFACES, label } from "@/lib/domain/constants";
import { formatDays, parseDays } from "@/lib/domain/pricing";
import { formatVND } from "@/lib/domain/money";
import { conflictingPitchIds, overlaps } from "@/lib/domain/schedule";
import { addDays, formatDateShort, fromVN, isDateKey, minutesToHHMM, todayKey, vnDateKey, vnParts } from "@/lib/domain/time";
import { Flash } from "@/components/flash";
import { Badge, Stars } from "@/components/ui";
import { VenueMap } from "@/components/venue-map";
import { BookingForm } from "./booking-form";
import { createBookingAction, reportVenueAction } from "./actions";

type SP = { date?: string; pitch?: string; start?: string; error?: string; ok?: string };

async function load(slug: string) {
  return db.venue.findUnique({
    where: { slug },
    include: {
      pitches: { where: { active: true }, orderBy: { sortOrder: "asc" } },
      priceRules: { orderBy: [{ startMin: "asc" }] },
      holidays: true,
      reviews: { include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const v = await load((await params).slug);
  if (!v) return {};
  return {
    title: `${v.name} – ${v.district}, ${v.province}`,
    description: `${v.name}, ${v.address}, ${v.district}. Bảng giá theo khung giờ, giờ còn trống, đặt sân online trên ChọnSân.`,
  };
}

export default async function VenuePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<SP> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const venue = await load(slug);
  const user = await getCurrentUser();
  if (!venue) notFound();
  const canManage = user && (user.id === venue.ownerId || user.role === "ADMIN");
  if (venue.status !== "APPROVED" && !canManage) notFound();

  const today = todayKey();
  const date = sp.date && isDateKey(sp.date) ? sp.date : today;
  const dates = Array.from({ length: 14 }, (_, i) => addDays(today, i));
  const [bookings, links, deals, teams] = await Promise.all([
    bookingsForDay(venue.id, date),
    db.pitchLink.findMany({ where: { parent: { venueId: venue.id } } }),
    db.deal.findMany({ where: { venueId: venue.id, end: { gt: new Date() } }, orderBy: { start: "asc" } }),
    user ? db.team.findMany({ where: { members: { some: { userId: user.id, active: true } } }, select: { id: true, name: true } }) : [],
  ]);
  // Hôm nay: bắt đầu lưới từ giờ hiện tại (làm tròn xuống 30 phút) thay vì giờ mở cửa
  const firstSlot = date === today ? Math.max(venue.openMin, Math.floor(vnParts(new Date()).minutes / 30) * 30) : venue.openMin;
  const slots: number[] = [];
  for (let m = firstSlot; m < venue.closeMin; m += 30) slots.push(m);
  const nowMs = Date.now();
  const isBusy = (pitchId: string, m: number) => {
    const s = fromVN(date, m), e = fromVN(date, m + 30);
    if (e.getTime() <= nowMs) return true;
    const ids = conflictingPitchIds(pitchId, links);
    return bookings.some((b) => ids.includes(b.pitchId) && overlaps(b.start, b.end, s, e));
  };
  const rating = venue.reviews.length ? venue.reviews.reduce((a, r) => a + r.rating, 0) / venue.reviews.length : null;
  const pitchName = (id: string | null) => (id ? venue.pitches.find((p) => p.id === id)?.name ?? "" : "Tất cả sân");
  const dealRows = deals.map((d) => ({
    date: vnDateKey(d.start), startMin: vnParts(d.start).minutes,
    endMin: vnDateKey(d.end) === vnDateKey(d.start) ? vnParts(d.end).minutes : 1440, percent: d.percent,
  }));
  const jsonLd = {
    "@context": "https://schema.org", "@type": "SportsActivityLocation", name: venue.name,
    address: { "@type": "PostalAddress", streetAddress: venue.address, addressLocality: venue.district, addressRegion: venue.province, addressCountry: "VN" },
    geo: { "@type": "GeoCoordinates", latitude: venue.lat, longitude: venue.lng }, telephone: venue.phone,
    ...(rating ? { aggregateRating: { "@type": "AggregateRating", ratingValue: rating.toFixed(1), reviewCount: venue.reviews.length } } : {}),
  };

  return (
    <div className="container-page py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Flash searchParams={sp} />
      {venue.status !== "APPROVED" && (
        <div className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Sân đang chờ quản trị viên duyệt — chỉ bạn nhìn thấy trang này.</div>
      )}
      <nav className="muted mb-2"><Link href="/san">Tìm sân</Link> › <Link href={`/san?province=${encodeURIComponent(venue.province)}&district=${encodeURIComponent(venue.district)}`}>{venue.district}</Link></nav>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="h1">{venue.name} {venue.verified && <span className="text-base text-brand-600" title="Đã xác minh">✔ Đã xác minh</span>}</h1>
          <p className="mt-1 text-gray-600">{venue.address}, {venue.district}, {venue.province}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Stars value={rating} count={venue.reviews.length} />
            <span className="muted">· Mở cửa {minutesToHHMM(venue.openMin)}–{minutesToHHMM(venue.closeMin)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <a className="btn-secondary" href={`https://www.google.com/maps/dir/?api=1&destination=${venue.lat},${venue.lng}`} target="_blank" rel="noreferrer">🧭 Chỉ đường</a>
          {canManage && <Link className="btn-secondary" href={`/chu-san/${venue.id}`}>Quản lý sân</Link>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {deals.length > 0 && (
            <div className="card border-accent-500 bg-amber-50">
              <h2 className="h2">🔥 Giờ trống giảm giá</h2>
              <ul className="mt-2 space-y-1 text-sm">
                {dealRows.map((d, i) => <li key={i}>{formatDateShort(d.date)} · {minutesToHHMM(d.startMin)}–{minutesToHHMM(d.endMin)} · <strong>giảm {d.percent}%</strong></li>)}
              </ul>
            </div>
          )}

          <section className="card">
            <div className="mb-3 flex items-center justify-between"><h2 className="h2">Lịch trống</h2><span className="muted">Bấm ô trống để chọn giờ</span></div>
            <div className="-mx-1 mb-3 flex gap-1 overflow-x-auto px-1 pb-1">
              {dates.map((d, i) => (
                <Link key={d} href={`/san/${slug}?date=${d}`} scroll={false}
                  className={`shrink-0 rounded-xl border px-3 py-1.5 text-center text-xs ${d === date ? "border-brand-600 bg-brand-600 text-white" : "border-gray-200 bg-white"}`}>
                  {i === 0 ? "Hôm nay" : formatDateShort(d)}
                </Link>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="border-separate border-spacing-0.5 text-[11px]">
                <thead><tr><th className="sticky left-0 bg-white pr-2 text-left font-medium text-gray-500">Sân</th>
                  {slots.map((m) => <th key={m} className="min-w-9 font-normal text-gray-400">{m % 60 === 0 ? minutesToHHMM(m) : ""}</th>)}</tr></thead>
                <tbody>
                  {venue.pitches.map((p) => (
                    <tr key={p.id}>
                      <td className="sticky left-0 whitespace-nowrap bg-white pr-2 font-medium">{p.name}</td>
                      {slots.map((m) => isBusy(p.id, m) ? (
                        <td key={m} className="h-7 rounded bg-gray-200" title="Đã có lịch" />
                      ) : (
                        <td key={m} className="h-7 p-0">
                          <Link href={`/san/${slug}?date=${date}&pitch=${p.id}&start=${m}#dat-san`} scroll={false}
                            className="block h-7 rounded bg-brand-100 hover:bg-brand-500" title={`${p.name} ${minutesToHHMM(m)} trống`} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 flex gap-4 text-xs text-gray-500"><span><span className="mr-1 inline-block h-3 w-3 rounded bg-brand-100" />Trống</span><span><span className="mr-1 inline-block h-3 w-3 rounded bg-gray-200" />Đã đặt / đã qua</span></p>
          </section>

          <section className="card">
            <h2 className="h2 mb-3">Bảng giá</h2>
            <div className="overflow-x-auto"><table className="table">
              <thead><tr><th>Ngày</th><th>Khung giờ</th><th>Áp dụng</th><th className="text-right">Giá/giờ</th></tr></thead>
              <tbody>
                {venue.priceRules.map((r) => (
                  <tr key={r.id}><td>{formatDays(parseDays(r.daysOfWeek))}</td><td>{minutesToHHMM(r.startMin)}–{minutesToHHMM(r.endMin)}</td>
                    <td>{pitchName(r.pitchId)}</td><td className="text-right font-semibold text-brand-700">{formatVND(r.pricePerHour)}</td></tr>
                ))}
              </tbody>
            </table></div>
            {venue.holidays.length > 0 && <p className="muted mt-2">Ngày lễ: {venue.holidays.map((h) => `${h.name || h.date} (${h.percent}%)`).join(" · ")}</p>}
          </section>

          <section className="card">
            <h2 className="h2 mb-2">Thông tin sân</h2>
            {venue.description && <p className="mb-3 whitespace-pre-line text-sm text-gray-700">{venue.description}</p>}
            <div className="mb-3 flex flex-wrap gap-1.5">{venue.amenities.split(",").filter(Boolean).map((a) => <Badge key={a} tone="green">{label(AMENITIES, a)}</Badge>)}</div>
            <ul className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
              {venue.pitches.map((p) => <li key={p.id}>• <strong>{p.name}</strong>: {label(PITCH_SIZES, p.size)}, {label(SURFACES, p.surface)}{p.covered ? ", có mái che" : ""}</li>)}
            </ul>
            <div className="mt-4"><VenueMap center={[venue.lat, venue.lng]} zoom={15} height={260} points={[{ id: venue.id, lat: venue.lat, lng: venue.lng, title: venue.name, subtitle: venue.address }]} /></div>
          </section>

          <section className="card">
            <h2 className="h2 mb-3">Đánh giá ({venue.reviews.length})</h2>
            {venue.reviews.length === 0 ? <p className="muted">Chưa có đánh giá. Đá xong hãy quay lại đánh giá nhé!</p> : (
              <ul className="divide-y divide-gray-100">
                {venue.reviews.map((r) => (
                  <li key={r.id} className="py-3 text-sm"><div className="flex justify-between"><strong>{r.user.name}</strong><span className="text-amber-500">{"★".repeat(r.rating)}<span className="text-gray-300">{"★".repeat(5 - r.rating)}</span></span></div>
                    {r.comment && <p className="mt-1 text-gray-700">{r.comment}</p>}</li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-5">
          <section id="dat-san" className="card scroll-mt-20 lg:sticky lg:top-20">
            <h2 className="h2 mb-3">Đặt sân</h2>
            {venue.status === "APPROVED" ? (
              <BookingForm
                key={`${sp.pitch}-${date}-${sp.start}`}
                action={createBookingAction.bind(null, slug)}
                pitches={venue.pitches.map((p) => ({ id: p.id, name: p.name, size: p.size }))}
                rules={venue.priceRules} holidays={venue.holidays} deals={dealRows}
                dates={dates.map((d, i) => ({ key: d, label: i === 0 ? `Hôm nay (${formatDateShort(d)})` : formatDateShort(d) }))}
                openMin={venue.openMin} closeMin={venue.closeMin} depositType={venue.depositType} depositValue={venue.depositValue}
                teams={teams} loggedIn={!!user} loginHref={`/dang-nhap?next=${encodeURIComponent(`/san/${slug}`)}`}
                initial={{ pitchId: sp.pitch, date, start: sp.start ? Number(sp.start) : undefined }}
              />
            ) : <p className="muted">Sân chưa được duyệt nên chưa nhận đặt.</p>}
            <p className="mt-3 text-xs text-gray-500">Hủy miễn phí trước {venue.cancelHours} giờ. ChọnSân không giữ tiền — cọc chuyển thẳng cho chủ sân.</p>
            <p className="mt-1 text-xs text-gray-500">Liên hệ chủ sân: {user ? <a className="font-medium text-brand-700" href={`tel:${venue.phone}`}>{venue.phone}</a> : "đăng nhập để xem"}</p>
          </section>
          {user && (
            <details className="card text-sm">
              <summary className="cursor-pointer text-gray-500">Báo cáo sân này</summary>
              <form action={reportVenueAction.bind(null, slug)} className="mt-3 space-y-2">
                <select name="reason" className="input">{Object.entries(REPORT_REASONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                <textarea name="detail" className="input" rows={2} placeholder="Mô tả ngắn" />
                <button className="btn-danger btn-sm">Gửi báo cáo</button>
              </form>
            </details>
          )}
        </aside>
      </div>
    </div>
  );
}
