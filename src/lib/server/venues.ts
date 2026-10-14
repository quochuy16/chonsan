import { db } from "./db";
import { OCCUPYING_STATUSES } from "@/lib/domain/constants";
import { haversineKm } from "@/lib/domain/geo";
import { minHourlyPrice, parseDays, quote } from "@/lib/domain/pricing";
import { conflictingPitchIds, overlaps } from "@/lib/domain/schedule";
import { dowOfKey, fromVN } from "@/lib/domain/time";
import { stripDiacritics } from "@/lib/domain/text";

export interface VenueSearch {
  q?: string;
  province?: string;
  district?: string;
  size?: string;
  amenity?: string;
  date?: string;
  startMin?: number;
  duration?: number;
  lat?: number;
  lng?: number;
  sort?: "distance" | "price" | "rating";
}

export async function searchVenues(s: VenueSearch) {
  const venues = await db.venue.findMany({
    where: {
      status: "APPROVED",
      ...(s.province ? { province: s.province } : {}),
      ...(s.district ? { district: s.district } : {}),
    },
    include: {
      pitches: { where: { active: true } },
      priceRules: true,
      reviews: { select: { rating: true } },
    },
  });
  const q = s.q ? stripDiacritics(s.q.toLowerCase()) : "";
  let list = venues
    .filter((v) => !q || stripDiacritics(`${v.name} ${v.address} ${v.district}`.toLowerCase()).includes(q))
    .filter((v) => !s.size || v.pitches.some((p) => p.size === s.size))
    .filter((v) => !s.amenity || v.amenities.split(",").includes(s.amenity))
    .map((v) => {
      const ratings = v.reviews.map((r) => r.rating);
      return {
        ...v,
        minPrice: minHourlyPrice(v.priceRules),
        rating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null,
        ratingCount: ratings.length,
        distanceKm: s.lat !== undefined && s.lng !== undefined ? haversineKm(s.lat, s.lng, v.lat, v.lng) : null,
        freePitches: [] as string[],
      };
    });

  // Lọc theo giờ còn trống: phải có ít nhất 1 sân con (đúng loại) trống & có giá trong khung giờ đó
  if (s.date && s.startMin !== undefined && s.duration) {
    const start = fromVN(s.date, s.startMin);
    const end = fromVN(s.date, s.startMin + s.duration);
    const dow = dowOfKey(s.date);
    const ids = list.map((v) => v.id);
    const [bookings, links] = await Promise.all([
      db.booking.findMany({
        where: { pitch: { venueId: { in: ids } }, status: { in: OCCUPYING_STATUSES }, start: { lt: end }, end: { gt: start } },
        select: { pitchId: true, start: true, end: true },
      }),
      db.pitchLink.findMany({ where: { parent: { venueId: { in: ids } } } }),
    ]);
    list = list
      .map((v) => {
        const free = v.pitches.filter((p) => {
          if (s.size && p.size !== s.size) return false;
          const priced = quote({
            rules: v.priceRules.map((r) => ({ ...r, daysOfWeek: parseDays(r.daysOfWeek) })),
            pitchId: p.id, dow, startMin: s.startMin!, endMin: s.startMin! + s.duration!,
          }).ok;
          if (!priced) return false;
          const related = conflictingPitchIds(p.id, links);
          return !bookings.some((b) => related.includes(b.pitchId) && overlaps(b.start, b.end, start, end));
        });
        return { ...v, freePitches: free.map((p) => p.name) };
      })
      .filter((v) => v.freePitches.length > 0);
  }

  const sort = s.sort ?? (s.lat !== undefined ? "distance" : "rating");
  list.sort((a, b) => {
    if (sort === "distance") return (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9);
    if (sort === "price") return (a.minPrice ?? 1e12) - (b.minPrice ?? 1e12);
    // rating: ưu tiên gói Pro rồi điểm
    const pro = Number(b.plan === "PRO") - Number(a.plan === "PRO");
    return pro || (b.rating ?? 0) - (a.rating ?? 0);
  });
  return list;
}

export type VenueSearchResult = Awaited<ReturnType<typeof searchVenues>>[number];
