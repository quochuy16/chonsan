import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { OWNER_LOGIN } from "./urls";

const COOKIE = "cs_session";
// Đặt ".chonsan.vn" khi deploy để web Tìm sân và web Chủ sân dùng chung một lần đăng nhập
const COOKIE_DOMAIN = process.env.SESSION_COOKIE_DOMAIN || undefined;
const MAX_AGE = 60 * 60 * 24 * 30;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET phải dài ít nhất 32 ký tự (xem .env.example)");
  return new TextEncoder().encode(s);
}

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}

export async function verifyPassword(pw: string, hash: string) {
  if (!hash) return false; // tài khoản Google, chưa đặt mật khẩu
  return bcrypt.compare(pw, hash);
}

export async function createSession(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    domain: COOKIE_DOMAIN,
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete({ name: COOKIE, path: "/", domain: COOKIE_DOMAIN });
}

export const getCurrentUser = cache(async () => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) return null;
    const user = await db.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.banned) return null;
    return user;
  } catch {
    return null;
  }
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function requireUser(next = "/"): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/dang-nhap?next=${encodeURIComponent(next)}`);
  // Đăng ký bằng Google chưa có SĐT → bắt buộc hoàn tất hồ sơ trước khi dùng tính năng cần đăng nhập
  if (!user.phone) redirect(`/tai-khoan/hoan-tat?next=${encodeURIComponent(next)}`);
  return user;
}

/** Web Chủ sân (/chu-san) có trang đăng nhập riêng; chưa có SĐT vẫn phải hoàn tất hồ sơ như bên Tìm sân. */
export async function requireOwnerUser(next = "/chu-san"): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`${OWNER_LOGIN}?next=${encodeURIComponent(next)}`);
  return requireUser(next);
}

export const ADMIN_LOGIN = "/quan-tri/dang-nhap";

/** Khu quản trị (/quan-tri) có trang đăng nhập riêng; người không phải ADMIN bị chặn ở đó. */
export async function requireAdmin(next = "/quan-tri"): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`${ADMIN_LOGIN}?next=${encodeURIComponent(next)}`);
  if (user.role !== "ADMIN") redirect(`${ADMIN_LOGIN}?error=${encodeURIComponent("Tài khoản này không có quyền quản trị")}`);
  return user;
}
