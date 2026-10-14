import { NextResponse, type NextRequest } from "next/server";
import { isOwnerPath, OWNER_PREFIX } from "@/lib/server/urls";

// Tách hai web theo tên miền khi deploy (đặt cả SITE_URL và OWNER_URL):
//   - host Chủ sân chỉ phục vụ /chu-san…; trang khác chuyển sang web Tìm sân
//   - host Tìm sân chuyển /chu-san… sang web Chủ sân
// Local (không đặt OWNER_URL): không làm gì, cả hai chạy chung localhost:3000.
const SHARED = ["/_next", "/auth", "/api", "/favicon.ico", "/robots.txt", "/sitemap.xml"];

export function middleware(req: NextRequest) {
  const site = process.env.SITE_URL, owner = process.env.OWNER_URL;
  if (!site || !owner) return NextResponse.next();
  const { pathname, search } = req.nextUrl;
  if (SHARED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return NextResponse.next();
  const onOwnerHost = req.headers.get("host") === new URL(owner).host;
  if (onOwnerHost) {
    if (pathname === "/") return NextResponse.redirect(new URL(OWNER_PREFIX, owner));
    if (!isOwnerPath(pathname)) return NextResponse.redirect(new URL(pathname + search, site));
  } else if (isOwnerPath(pathname)) {
    return NextResponse.redirect(new URL(pathname + search, owner));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image).*)"] };
