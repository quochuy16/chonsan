"use server";
import { redirect } from "next/navigation";
import { db } from "@/lib/server/db";
import { destroySession, getCurrentUser, requireUser } from "@/lib/server/auth";
import { done, fail, str } from "@/lib/server/flash";
import { isValidPhone, normalizePhone, randomCode } from "@/lib/domain/text";
import { isKey, LEVELS } from "@/lib/domain/constants";

export async function updateProfileAction(form: FormData) {
  const user = await requireUser("/tai-khoan");
  const name = str(form, "name");
  const phone = normalizePhone(str(form, "phone"));
  if (name.length < 2) fail("/tai-khoan", "Vui lòng nhập họ tên");
  if (!isValidPhone(phone)) fail("/tai-khoan", "Số điện thoại không hợp lệ");
  const level = str(form, "skillLevel");
  await db.user.update({
    where: { id: user.id },
    data: {
      name, phone,
      province: str(form, "province") || null,
      district: str(form, "district") || null,
      skillLevel: isKey(LEVELS, level) ? level : null,
      position: str(form, "position").slice(0, 40) || null,
    },
  });
  done("/tai-khoan", "Đã lưu hồ sơ");
}

export async function markAllReadAction() {
  const user = await requireUser("/tai-khoan/thong-bao");
  await db.notification.updateMany({ where: { userId: user.id, read: false }, data: { read: true } });
  redirect("/tai-khoan/thong-bao");
}

/** Nghị định 13/2023: cho phép người dùng xóa dữ liệu cá nhân */
export async function deleteAccountAction(form: FormData) {
  // getCurrentUser (không phải requireUser): tài khoản Google chưa điền SĐT vẫn được quyền xóa
  const user = await getCurrentUser();
  if (!user) redirect("/dang-nhap");
  if (str(form, "confirm") !== "XOA") fail("/tai-khoan", 'Gõ "XOA" để xác nhận xóa tài khoản');
  if (await db.venue.count({ where: { ownerId: user.id } })) fail("/tai-khoan", "Bạn đang sở hữu cụm sân. Hãy liên hệ quản trị viên để chuyển hoặc đóng sân trước.");
  await db.$transaction([
    db.notification.deleteMany({ where: { userId: user.id } }),

    db.user.update({
      where: { id: user.id },
      data: { name: "Người dùng đã xóa", email: `deleted-${randomCode(10)}@chonsan.invalid`, phone: "", passwordHash: "", googleId: null, banned: true, province: null, district: null, position: null },
    }),
  ]);
  await destroySession();
  redirect("/");
}

/** Tài khoản tạo qua Google: bổ sung SĐT + đồng ý chính sách (NĐ 13/2023) */
export async function completeProfileAction(form: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/dang-nhap");
  const rawNext = str(form, "next");
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";
  const back = `/tai-khoan/hoan-tat?next=${encodeURIComponent(next)}`;
  const name = str(form, "name");
  const phone = normalizePhone(str(form, "phone"));
  if (name.length < 2) fail(back, "Vui lòng nhập họ tên");
  if (!isValidPhone(phone)) fail(back, "Số điện thoại cần 10 số, bắt đầu bằng 0");
  if (!form.get("agree")) fail(back, "Bạn cần đồng ý với chính sách quyền riêng tư");
  await db.user.update({ where: { id: user.id }, data: { name, phone } });
  redirect(next);
}

/** Bỏ liên kết Google — chỉ cho phép khi tài khoản còn mật khẩu để đăng nhập */
export async function unlinkGoogleAction() {
  const user = await requireUser("/tai-khoan");
  if (!user.passwordHash) fail("/tai-khoan", "Tài khoản này chỉ đăng nhập được bằng Google nên không thể bỏ liên kết");
  await db.user.update({ where: { id: user.id }, data: { googleId: null } });
  done("/tai-khoan", "Đã bỏ liên kết Google");
}
