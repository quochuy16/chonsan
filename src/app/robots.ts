import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.SITE_URL ?? "http://localhost:3000";
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/chu-san/", "/quan-tri", "/tai-khoan", "/dat-san"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
