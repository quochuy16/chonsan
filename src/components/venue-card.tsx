import Link from "next/link";
import { AMENITIES, label } from "@/lib/domain/constants";
import { formatDistance } from "@/lib/domain/geo";
import { formatVND } from "@/lib/domain/money";
import { Badge, Stars } from "./ui";

export function VenueCard({
  v,
}: {
  v: {
    slug: string;
    name: string;
    address: string;
    district: string;
    province: string;
    imageUrl: string | null;
    verified: boolean;
    amenities: string;
    pitches: { size: string }[];
    minPrice: number | null;
    rating: number | null;
    ratingCount: number;
    distanceKm: number | null;
    freePitches?: string[];
  };
}) {
  const sizes = [...new Set(v.pitches.map((p) => p.size))].sort((a, b) => Number(a) - Number(b));
  return (
    <Link href={`/san/${v.slug}`} className="card group flex min-w-0 gap-4 transition hover:border-brand-500 hover:shadow-md">
      <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-500 to-brand-800 text-3xl sm:h-28 sm:w-36">
        {v.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={v.imageUrl} alt={v.name} className="h-full w-full object-cover" />
        ) : (
          "⚽"
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate font-bold text-gray-900 group-hover:text-brand-700">
            {v.name} {v.verified && <span title="Đã xác minh" className="text-brand-600">✔</span>}
          </h3>
          {v.distanceKm !== null && <span className="shrink-0 text-xs font-medium text-sky-700">{formatDistance(v.distanceKm)}</span>}
        </div>
        <p className="truncate text-sm text-gray-500">{v.address}, {v.district}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <Stars value={v.rating} count={v.ratingCount} />
          {sizes.map((s) => <Badge key={s} tone="green">Sân {s}</Badge>)}
          {v.amenities.split(",").filter(Boolean).slice(0, 3).map((a) => <Badge key={a}>{label(AMENITIES, a)}</Badge>)}
        </div>
        <div className="mt-2 flex items-end justify-between">
          {v.minPrice !== null ? (
            <p className="text-sm">từ <span className="font-bold text-brand-700">{formatVND(v.minPrice)}</span>/giờ</p>
          ) : <span />}
          {v.freePitches && v.freePitches.length > 0 && (
            <span className="text-xs font-medium text-brand-700">Còn trống: {v.freePitches.join(", ")}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
