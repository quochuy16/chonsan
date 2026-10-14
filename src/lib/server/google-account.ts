import type { User } from "@prisma/client";
import { db } from "./db";
import type { GoogleProfile } from "./google";

export type GoogleAccountResult = { user: User; isNew: boolean } | { error: string };

/**
 * Tìm/tạo tài khoản cho hồ sơ Google.
 * - linkToUserId: người đang đăng nhập muốn liên kết Google vào tài khoản của mình.
 * - Đã có googleId → đăng nhập. Trùng email (Google đã xác minh) → tự liên kết. Chưa có → tạo mới (chưa có SĐT).
 */
export async function resolveGoogleAccount(p: GoogleProfile, linkToUserId?: string): Promise<GoogleAccountResult> {
  const byGoogle = await db.user.findUnique({ where: { googleId: p.sub } });

  if (linkToUserId) {
    if (byGoogle && byGoogle.id !== linkToUserId) return { error: "Tài khoản Google này đã liên kết với một tài khoản ChonSan khác" };
    const user = await db.user.update({ where: { id: linkToUserId }, data: { googleId: p.sub } });
    return { user, isNew: false };
  }

  if (byGoogle) return byGoogle.banned ? { error: "Tài khoản đã bị khóa" } : { user: byGoogle, isNew: false };

  const byEmail = await db.user.findUnique({ where: { email: p.email } });
  if (byEmail) {
    if (byEmail.banned) return { error: "Tài khoản đã bị khóa" };
    if (byEmail.googleId) return { error: "Email này đã liên kết với một tài khoản Google khác" };
    const user = await db.user.update({ where: { id: byEmail.id }, data: { googleId: p.sub } });
    return { user, isNew: false };
  }

  const user = await db.user.create({ data: { email: p.email, name: p.name, phone: "", passwordHash: "", googleId: p.sub } });
  return { user, isNew: true };
}
