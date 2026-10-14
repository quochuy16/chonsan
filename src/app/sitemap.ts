import type { MetadataRoute } from "next";
import { db } from "@/lib/server/db";
import { LOCATIONS } from "@/lib/domain/locations";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.SITE_URL ?? "http://localhost:3000";
  const venues = await db.venue.findMany({ where: { status: "APPROVED" }, select: { slug: true, createdAt: true } });
  const areas = Object.entries(LOCATIONS).flatMap(([p, info]) => info.areas.map((a) => `${base}/san?province=${encodeURIComponent(p)}&district=${encodeURIComponent(a)}`));
  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/san`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/keo`, changeFrequency: "hourly", priority: 0.8 },
    ...venues.map((v) => ({ url: `${base}/san/${v.slug}`, lastModified: v.createdAt, priority: 0.8 })),
    ...areas.map((url) => ({ url, priority: 0.6 })),
  ];
}
