"use server";
import { db } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { getVenueAccess } from "@/lib/server/permissions";
import { done, fail, int, str } from "@/lib/server/flash";
import { fromVN, hhmmToMinutes, isDateKey } from "@/lib/domain/time";

async function ownerAccess(venueId: string, back: string) {
  const user = await requireUser(back);
  const access = await getVenueAccess(venueId, user);
  if (!access?.isOwner) fail("/chu-san", "Bạn không có quyền sửa bảng giá");
  return access.venue;
}

export async function addPriceRuleAction(venueId: string, form: FormData) {
  const back = `/chu-san/${venueId}/bang-gia`;
  await ownerAccess(venueId, back);
  const days = form.getAll("days").map(Number).filter((d) => d >= 0 && d <= 6);
  const startMin = hhmmToMinutes(str(form, "start"));
  const endMin = hhmmToMinutes(str(form, "end"));
  const price = int(form, "price");
  const pitchId = str(form, "pitchId") || null;
  if (days.length === 0) fail(back, "Chọn ít nhất 1 ngày");
  if (!(startMin < endMin) || startMin % 30 || endMin % 30) fail(back, "Khung giờ không hợp lệ (bội số 30 phút)");
  if (price < 10000) fail(back, "Giá phải từ 10.000đ/giờ");
  if (pitchId && !(await db.pitch.findFirst({ where: { id: pitchId, venueId } }))) fail(back, "Sân con không hợp lệ");
  // Không cho hai rule cùng phạm vi chồng giờ trong cùng ngày
  const existing = await db.priceRule.findMany({ where: { venueId, pitchId } });
  const clash = existing.find((r) => r.daysOfWeek.split(",").map(Number).some((d) => days.includes(d)) && r.startMin < endMin && startMin < r.endMin);
  if (clash) fail(back, "Khung giờ này đã có giá cho cùng ngày/sân. Xóa dòng cũ trước khi thêm.");
  await db.priceRule.create({ data: { venueId, pitchId, daysOfWeek: days.join(","), startMin, endMin, pricePerHour: price } });
  done(back, "Đã thêm khung giá");
}

export async function deletePriceRuleAction(venueId: string, ruleId: string) {
  const back = `/chu-san/${venueId}/bang-gia`;
  await ownerAccess(venueId, back);
  await db.priceRule.deleteMany({ where: { id: ruleId, venueId } });
  done(back, "Đã xóa khung giá");
}

export async function addHolidayAction(venueId: string, form: FormData) {
  const back = `/chu-san/${venueId}/bang-gia`;
  await ownerAccess(venueId, back);
  const date = str(form, "date");
  const percent = int(form, "percent", 120);
  if (!isDateKey(date)) fail(back, "Ngày không hợp lệ");
  if (percent < 50 || percent > 300) fail(back, "Phần trăm giá từ 50% đến 300%");
  await db.venueHoliday.upsert({
    where: { venueId_date: { venueId, date } },
    create: { venueId, date, percent, name: str(form, "name") },
    update: { percent, name: str(form, "name") },
  });
  done(back, "Đã lưu giá ngày lễ");
}

export async function deleteHolidayAction(venueId: string, id: string) {
  const back = `/chu-san/${venueId}/bang-gia`;
  await ownerAccess(venueId, back);
  await db.venueHoliday.deleteMany({ where: { id, venueId } });
  done(back, "Đã xóa ngày lễ");
}

export async function addDealAction(venueId: string, form: FormData) {
  const back = `/chu-san/${venueId}/bang-gia`;
  const venue = await ownerAccess(venueId, back);
  if (venue.plan !== "PRO") fail(back, "Giờ trống giảm giá là tính năng gói Pro");
  const date = str(form, "date");
  const startMin = hhmmToMinutes(str(form, "start"));
  const endMin = hhmmToMinutes(str(form, "end"));
  const percent = int(form, "percent");
  if (!isDateKey(date) || !(startMin < endMin)) fail(back, "Khung giờ không hợp lệ");
  if (percent < 5 || percent > 70) fail(back, "Giảm từ 5% đến 70%");
  if (fromVN(date, endMin) <= new Date()) fail(back, "Khung giờ đã qua");
  await db.deal.create({ data: { venueId, start: fromVN(date, startMin), end: fromVN(date, endMin), percent } });
  done(back, "Đã đăng giờ trống giảm giá");
}

export async function deleteDealAction(venueId: string, id: string) {
  const back = `/chu-san/${venueId}/bang-gia`;
  await ownerAccess(venueId, back);
  await db.deal.deleteMany({ where: { id, venueId } });
  done(back, "Đã gỡ giảm giá");
}

export async function addStaffAction(venueId: string, form: FormData) {
  const back = `/chu-san/${venueId}/cai-dat`;
  const venue = await ownerAccess(venueId, back);
  if (venue.plan !== "PRO") fail(back, "Thêm nhân viên là tính năng gói Pro");
  const email = str(form, "email").toLowerCase();
  const staff = await db.user.findUnique({ where: { email } });
  if (!staff) fail(back, "Không tìm thấy tài khoản với email này. Nhân viên cần đăng ký ChọnSân trước.");
  if (staff.id === venue.ownerId) fail(back, "Đây là tài khoản chủ sân");
  await db.venueStaff.upsert({ where: { venueId_userId: { venueId, userId: staff.id } }, create: { venueId, userId: staff.id }, update: {} });
  await db.notification.create({ data: { userId: staff.id, title: `Bạn được thêm làm nhân viên ${venue.name}`, link: `/chu-san/${venueId}` } });
  done(back, `Đã thêm ${staff.name}`);
}

export async function removeStaffAction(venueId: string, staffId: string) {
  const back = `/chu-san/${venueId}/cai-dat`;
  await ownerAccess(venueId, back);
  await db.venueStaff.deleteMany({ where: { id: staffId, venueId } });
  done(back, "Đã xóa nhân viên");
}
