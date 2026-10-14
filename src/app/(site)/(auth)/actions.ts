"use server";
import { redirect } from "next/navigation";
import { db } from "@/lib/server/db";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/server/auth";
import { fail, str } from "@/lib/server/flash";
import { isValidPhone, normalizePhone } from "@/lib/domain/text";

function safeNext(next: string) {
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export async function loginAction(form: FormData) {
  const email = str(form, "email").toLowerCase();
  const password = str(form, "password");
  const next = safeNext(str(form, "next"));
  const back = `/dang-nhap?next=${encodeURIComponent(next)}`;
  const user = await db.user.findUnique({ where: { email } });
  if (user && !user.passwordHash && user.googleId) fail(back, "Tài khoản này đăng ký bằng Google — hãy bấm \"Tiếp tục với Google\"");
  if (!user || !(await verifyPassword(password, user.passwordHash))) fail(back, "Email hoặc mật khẩu không đúng");
  if (user.banned) fail(back, "Tài khoản đã bị khóa");
  await createSession(user.id);
  redirect(next);
}

export async function registerAction(form: FormData) {
  const name = str(form, "name");
  const email = str(form, "email").toLowerCase();
  const phone = normalizePhone(str(form, "phone"));
  const password = str(form, "password");
  const next = safeNext(str(form, "next"));
  const back = `/dang-ky?next=${encodeURIComponent(next)}`;
  if (name.length < 2) fail(back, "Vui lòng nhập họ tên");
  if (!/^\S+@\S+\.\S+$/.test(email)) fail(back, "Email không hợp lệ");
  if (!isValidPhone(phone)) fail(back, "Số điện thoại cần 10 số, bắt đầu bằng 0");
  if (password.length < 8) fail(back, "Mật khẩu cần ít nhất 8 ký tự");
  if (!form.get("agree")) fail(back, "Bạn cần đồng ý với chính sách quyền riêng tư");
  if (await db.user.findUnique({ where: { email } })) fail(back, "Email này đã được đăng ký");
  const user = await db.user.create({
    data: { name, email, phone, passwordHash: await hashPassword(password) },
  });
  await createSession(user.id);
  redirect(next);
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}
