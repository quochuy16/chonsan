import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeCode, googleConfig, OAUTH_COOKIE } from "@/lib/server/google";
import { resolveGoogleAccount } from "@/lib/server/google-account";
import { createSession, getCurrentUser } from "@/lib/server/auth";
import { withParam } from "@/lib/server/flash";

interface OAuthState { state: string; verifier: string; next: string; link: boolean }

export async function GET(req: Request) {
  const url = new URL(req.url);
  const site = process.env.SITE_URL ?? url.origin;
  const go = (path: string) => NextResponse.redirect(new URL(path, site));
  const jar = await cookies();
  const raw = jar.get(OAUTH_COOKIE)?.value;
  jar.delete({ name: OAUTH_COOKIE, path: "/auth/google" });

  let saved: OAuthState | null = null;
  try { saved = raw ? (JSON.parse(raw) as OAuthState) : null; } catch { saved = null; }
  const failTo = saved?.link ? "/tai-khoan" : "/dang-nhap";
  if (url.searchParams.get("error")) return go(withParam(failTo, "error", "Bạn đã hủy đăng nhập Google"));
  const code = url.searchParams.get("code");
  if (!saved || !code || url.searchParams.get("state") !== saved.state) {
    return go(withParam(failTo, "error", "Phiên đăng nhập Google không hợp lệ hoặc đã hết hạn, vui lòng thử lại"));
  }
  const cfg = googleConfig();
  if (!cfg) return go(withParam("/dang-nhap", "error", "Đăng nhập Google chưa được cấu hình"));

  const profile = await exchangeCode(cfg, code, saved.verifier);
  if (typeof profile === "string") return go(withParam(failTo, "error", profile));
  const current = saved.link ? await getCurrentUser() : null;
  const result = await resolveGoogleAccount(profile, current?.id);
  if ("error" in result) return go(withParam(failTo, "error", result.error));

  if (saved.link) return go(withParam("/tai-khoan", "ok", "Đã liên kết tài khoản Google"));
  await createSession(result.user.id);
  if (!result.user.phone) return go(`/tai-khoan/hoan-tat?next=${encodeURIComponent(saved.next)}`);
  return go(saved.next);
}
