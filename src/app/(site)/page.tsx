import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/lib/server/db";
import { searchVenues } from "@/lib/server/venues";
import { COST_SPLIT, LEVELS, label } from "@/lib/domain/constants";
import { LOCATIONS } from "@/lib/domain/locations";
import { formatDateTime } from "@/lib/domain/time";
import { formatVND } from "@/lib/domain/money";
import { ownerUrl } from "@/lib/server/urls";
import { NearMeButton } from "@/components/near-me-button";
import { VenueCard } from "@/components/venue-card";

export default async function Home() {
  const [venues, matchPosts, playerPosts, stats] = await Promise.all([
    searchVenues({}),
    db.matchPost.findMany({ where: { status: "OPEN", start: { gt: new Date() } }, orderBy: { start: "asc" }, take: 4 }),
    db.playerPost.findMany({ where: { status: "OPEN", start: { gt: new Date() } }, orderBy: { start: "asc" }, take: 4 }),
    Promise.all([db.venue.count({ where: { status: "APPROVED" } }), db.matchPost.count(), db.booking.count()]),
  ]);
  return (
    <>
      <section className="bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 text-white">
        <div className="container-page py-12 sm:py-16">
          <p className="mb-2 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-medium">Bóng đá phủi · sắp có pickleball, cầu lông</p>
          <h1 className="max-w-2xl text-3xl font-extrabold leading-tight sm:text-5xl">Có sân chưa? Lên ChonSan.</h1>
          <p className="mt-3 max-w-xl text-white/85">
            Xem giá & giờ trống của sân gần bạn, đặt trong 30 giây. Ghép kèo, tìm người đá ghép — không còn lạc trong group Facebook.
          </p>
          <form action="/san" className="mt-6 flex max-w-2xl flex-col gap-2 rounded-2xl bg-white p-2 sm:flex-row">
            <input name="q" placeholder="Tên sân, đường, khu vực…" className="input border-0 text-gray-900 focus:ring-0" />
            <button className="btn-primary shrink-0">Tìm sân</button>
          </form>
          <div className="mt-3 flex flex-wrap gap-2"><Suspense><NearMeButton /></Suspense></div>
          <div className="mt-8 grid max-w-md grid-cols-3 gap-4 text-center">
            {[["Sân", stats[0]], ["Kèo đã đăng", stats[1]], ["Lượt đặt", stats[2]]].map(([l, n]) => (
              <div key={l as string}><p className="text-2xl font-extrabold">{n as number}</p><p className="text-xs text-white/75">{l as string}</p></div>
            ))}
          </div>
        </div>
      </section>

      <div className="container-page space-y-10 py-10">
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { href: "/san", icon: "🏟️", t: "Tìm & đặt sân", d: "Giá theo khung giờ, lịch trống thật" },
            { href: "/keo", icon: "🤝", t: "Ghép kèo", d: "Tìm đối cùng trình độ, có điểm uy tín" },

            { href: ownerUrl(), icon: "📅", t: "Cho chủ sân", d: "Web quản lý riêng: lịch sân thay sổ tay, thống kê doanh thu" },
          ].map((f) => (
            <Link key={f.href} href={f.href} className="card transition hover:border-brand-500">
              <p className="text-2xl">{f.icon}</p><p className="mt-2 font-bold">{f.t}</p><p className="muted">{f.d}</p>
            </Link>
          ))}
        </section>

        <section>
          <div className="mb-3 flex items-end justify-between"><h2 className="h2">Sân nổi bật</h2><Link href="/san" className="text-sm font-semibold text-brand-700">Xem tất cả →</Link></div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">{venues.slice(0, 6).map((v) => <VenueCard key={v.id} v={v} />)}</div>
        </section>

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div>
            <div className="mb-3 flex items-end justify-between"><h2 className="h2">Kèo đang tìm đối</h2><Link href="/keo" className="text-sm font-semibold text-brand-700">Tất cả →</Link></div>
            <div className="space-y-2">
              {matchPosts.length === 0 && <p className="muted">Chưa có kèo nào.</p>}
              {matchPosts.map((p) => (
                <Link key={p.id} href={`/keo/${p.id}`} className="card block hover:border-brand-500">
                  <p className="font-semibold">{p.teamName} <span className="font-normal text-gray-500">tìm đối sân {p.pitchSize}</span></p>
                  <p className="muted">{formatDateTime(p.start)} · {p.venueText} · {p.district}</p>
                  <p className="mt-1 text-xs text-gray-500">{label(LEVELS, p.level)} · {label(COST_SPLIT, p.costSplit)}</p>
                </Link>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-3 flex items-end justify-between"><h2 className="h2">Đang cần người đá ghép</h2><Link href="/keo?tab=nguoi" className="text-sm font-semibold text-brand-700">Tất cả →</Link></div>
            <div className="space-y-2">
              {playerPosts.length === 0 && <p className="muted">Chưa có bài nào.</p>}
              {playerPosts.map((p) => (
                <Link key={p.id} href={`/keo/nguoi/${p.id}`} className="card block hover:border-brand-500">
                  <p className="font-semibold">Cần {p.needed} người {p.position && <span className="font-normal text-gray-500">({p.position})</span>}</p>
                  <p className="muted">{formatDateTime(p.start)} · {p.venueText} · {p.district}</p>
                  <p className="mt-1 text-xs text-gray-500">{p.feePerPerson ? `${formatVND(p.feePerPerson)}/người` : "Miễn phí"}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section>
          <h2 className="h2 mb-3">Tìm sân theo khu vực</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {Object.entries(LOCATIONS).map(([prov, info]) => (
              <div key={prov} className="card">
                <p className="mb-2 font-semibold">{prov}</p>
                <div className="flex flex-wrap gap-1.5">
                  {info.areas.map((a) => (
                    <Link key={a} href={`/san?province=${encodeURIComponent(prov)}&district=${encodeURIComponent(a)}`} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs hover:bg-brand-100">{a}</Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
