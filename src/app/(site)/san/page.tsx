import Link from "next/link";
import { Suspense } from "react";
import { searchVenues } from "@/lib/server/venues";
import { AMENITIES, PITCH_SIZES } from "@/lib/domain/constants";
import { LOCATIONS } from "@/lib/domain/locations";
import { addDays, formatDateShort, hhmmToMinutes, isDateKey, minutesToHHMM, todayKey } from "@/lib/domain/time";
import { formatVND } from "@/lib/domain/money";
import { LocationSelect } from "@/components/location-select";
import { NearMeButton } from "@/components/near-me-button";
import { VenueCard } from "@/components/venue-card";
import { VenueMap } from "@/components/venue-map";
import { Empty } from "@/components/ui";

type SP = Record<string, string | undefined>;

export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const where = sp.district ? `${sp.district}, ${sp.province}` : sp.province;
  return {
    title: where ? `Sân bóng ${where} – giá & giờ trống` : "Tìm sân bóng gần bạn",
    description: `Danh sách sân bóng đá ${where ?? "gần bạn"}: bảng giá theo khung giờ, giờ còn trống, đặt sân online.`,
  };
}

const TIMES = Array.from({ length: 36 }, (_, i) => 300 + i * 30).filter((m) => m <= 1350);

export default async function SearchPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const lat = sp.lat ? Number(sp.lat) : undefined;
  const lng = sp.lng ? Number(sp.lng) : undefined;
  const date = sp.date && isDateKey(sp.date) ? sp.date : undefined;
  const startMin = sp.time ? hhmmToMinutes(sp.time) : undefined;
  const duration = sp.duration ? Number(sp.duration) : 90;
  const results = await searchVenues({
    q: sp.q, province: sp.province, district: sp.district, size: sp.size, amenity: sp.amenity,
    date, startMin: date ? startMin : undefined, duration: date && startMin !== undefined ? duration : undefined,
    lat, lng, sort: sp.sort as "distance" | "price" | "rating" | undefined,
  });
  const center: [number, number] = lat && lng ? [lat, lng]
    : results[0] ? [results[0].lat, results[0].lng]
    : [LOCATIONS[sp.province ?? "Hà Nội"]?.lat ?? 21.0285, LOCATIONS[sp.province ?? "Hà Nội"]?.lng ?? 105.8542];
  const today = todayKey();
  const view = sp.view === "map" ? "map" : "list";
  const toggleHref = (v: string) => `/san?${new URLSearchParams({ ...(sp as Record<string, string>), view: v }).toString()}`;

  return (
    <div className="container-page py-6">
      <h1 className="h1">{sp.district ? `Sân bóng ${sp.district}` : sp.province ? `Sân bóng ${sp.province}` : "Tìm sân bóng"}</h1>
      <p className="muted mb-4">Xem giá theo khung giờ và giờ còn trống, đặt sân ngay không cần gọi điện.</p>

      <form className="card mb-5 grid grid-cols-1 gap-3 md:grid-cols-12" action="/san">
        <div className="md:col-span-4">
          <label className="label" htmlFor="q">Tên sân / địa chỉ</label>
          <input id="q" name="q" defaultValue={sp.q} className="input" placeholder="VD: Mỹ Đình, Hoàng Cầu…" />
        </div>
        <div className="md:col-span-5"><LocationSelect province={sp.province} district={sp.district} allowAll /></div>
        <div className="md:col-span-3">
          <label className="label" htmlFor="size">Loại sân</label>
          <select id="size" name="size" defaultValue={sp.size ?? ""} className="input">
            <option value="">Tất cả</option>
            {Object.entries(PITCH_SIZES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="md:col-span-3">
          <label className="label" htmlFor="date">Ngày muốn đá</label>
          <select id="date" name="date" defaultValue={date ?? ""} className="input">
            <option value="">Bất kỳ</option>
            {Array.from({ length: 7 }, (_, i) => addDays(today, i)).map((d, i) => (
              <option key={d} value={d}>{i === 0 ? "Hôm nay" : i === 1 ? "Ngày mai" : formatDateShort(d)}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="label" htmlFor="time">Giờ bắt đầu</label>
          <select id="time" name="time" defaultValue={sp.time ?? "18:00"} className="input">
            {TIMES.map((m) => <option key={m} value={minutesToHHMM(m)}>{minutesToHHMM(m)}</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="label" htmlFor="duration">Thời lượng</label>
          <select id="duration" name="duration" defaultValue={String(duration)} className="input">
            {[60, 90, 120].map((d) => <option key={d} value={d}>{d} phút</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="label" htmlFor="amenity">Tiện ích</label>
          <select id="amenity" name="amenity" defaultValue={sp.amenity ?? ""} className="input">
            <option value="">Bất kỳ</option>
            {Object.entries(AMENITIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="md:col-span-3">
          <label className="label" htmlFor="sort">Sắp xếp</label>
          <select id="sort" name="sort" defaultValue={sp.sort ?? ""} className="input">
            <option value="">Nổi bật</option>
            <option value="distance">Gần nhất</option>
            <option value="price">Giá thấp</option>
            <option value="rating">Đánh giá cao</option>
          </select>
        </div>
        {lat && lng && <><input type="hidden" name="lat" value={lat} /><input type="hidden" name="lng" value={lng} /></>}
        <div className="flex flex-wrap items-center gap-2 md:col-span-12">
          <button className="btn-primary">Tìm sân</button>
          <Suspense><NearMeButton /></Suspense>
          <Link href="/san" className="btn-ghost">Xóa lọc</Link>
        </div>
      </form>

      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-gray-600">
          <strong>{results.length}</strong> sân{date && startMin !== undefined ? ` còn trống ${minutesToHHMM(startMin)}, ${formatDateShort(date)}` : ""}
        </p>
        <div className="flex gap-1">
          <Link href={toggleHref("list")} className={view === "list" ? "btn-primary btn-sm" : "btn-secondary btn-sm"}>Danh sách</Link>
          <Link href={toggleHref("map")} className={view === "map" ? "btn-primary btn-sm" : "btn-secondary btn-sm"}>Bản đồ</Link>
        </div>
      </div>

      {view === "map" && (
        <div className="mb-5">
          <VenueMap center={center} me={lat && lng ? [lat, lng] : null} height={420}
            points={results.map((v) => ({ id: v.id, lat: v.lat, lng: v.lng, title: v.name,
              subtitle: v.minPrice ? `từ ${formatVND(v.minPrice)}/giờ` : v.address, href: `/san/${v.slug}` }))} />
        </div>
      )}
      {results.length === 0 ? (
        <Empty title="Chưa tìm thấy sân phù hợp">Thử bỏ bớt bộ lọc, đổi giờ, hoặc chọn khu vực khác.</Empty>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">{results.map((v) => <VenueCard key={v.id} v={v} />)}</div>
      )}
    </div>
  );
}
