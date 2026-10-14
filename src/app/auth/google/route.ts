import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { buildAuthUrl, googleConfig, OAUTH_COOKIE, randomToken } from "@/lib/server/google";
import { getCurrentUser } from "@/lib/server/auth";
import { withParam } from "@/lib/server/flash";

const safeNext = (n: string | null) => (n && n.startsWith("/") && !n.startsWith("//") ? n : "/");

/** Bắt đầu đăng nhập Google: /auth/google?next=/san/...  (thêm &link=1 để liên kết vào tài khoản đang đăng nhập) */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const site = process.env.SITE_URL ?? url.origin;
  const cfg = googleConfig();
  if (!cfg) return NextResponse.redirect(new URL(withParam("/dang-nhap", "error", "Đăng nhập Google chưa được cấu hình"), site));
  const link = url.searchParams.get("link") === "1" && !!(await getCurrentUser());
  const state = randomToken();
  const verifier = randomToken(48);
  (await cookies()).set(OAUTH_COOKIE, JSON.stringify({ state, verifier, next: safeNext(url.searchParams.get("next")), link }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && site.startsWith("https"),
    path: "/auth/google",
    maxAge: 600,
  });
  return NextResponse.redirect(buildAuthUrl(cfg, state, verifier));
}
