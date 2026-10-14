"use server";
import { redirect } from "next/navigation";
import { db } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { getVenueAccess } from "@/lib/server/permissions";
import { bool, done, fail, int, str } from "@/lib/server/flash";
import { AMENITIES, DEPOSIT_TYPES, PITCH_SIZES, PLAN_LIMITS, SURFACES, isKey } from "@/lib/domain/constants";
import { LOCATIONS, isValidLocation } from "@/lib/domain/locations";
import { BANKS } from "@/lib/domain/vietqr";
import { hhmmToMinutes } from "@/lib/domain/time";
import { isValidPhone, normalizePhone, randomCode, slugify } from "@/lib/domain/text";

function venueFields(form: FormData, back: string) {
  const name = str(form, "name");
  const province = str(form, "province");
  const district = str(form, "district");
  const phone = normalizePhone(str(form, "phone"));
  if (name.length < 3) fail(back, "Tên sân quá ngắn");
  if (!isValidLocation(province, district)) fail(back, "Khu vực không hợp lệ");
  if (!isValidPhone(phone)) fail(back, "Số điện thoại không hợp lệ");
  const openMin = hhmmToMinutes(str(form, "open") || "05:00");
  const closeMin = hhmmToMinutes(str(form, "close") || "23:00");
  if (openMin >= closeMin || openMin % 30 || closeMin % 30) fail(back, "Giờ mở/đóng cửa không hợp lệ (bội số 30 phút)");
  let lat = Number(str(form, "lat"));
  let lng = Number(str(form, "lng"));
  if (!lat || !lng) ({ lat, lng } = LOCATIONS[province]);
  const bankBin = str(form, "bankBin");
  return {
    name, province, district, phone, openMin, closeMin, lat, lng,
    address: str(form, "address"),
    description: str(form, "description").slice(0, 2000),
    imageUrl: str(form, "imageUrl") || null,
    amenities: Object.keys(AMENITIES).filter((a) => form.get(`amenity_${a}`)).join(","),
    bankBin: bankBin && BANKS[bankBin] ? bankBin : null,
    bankAccount: str(form, "bankAccount").replace(/\s/g, "") || null,
    bankAccountName: str(form, "bankAccountName").toUpperCase() || null,
  };
}

export async function createVenueAction(form: FormData) {
  const user = await requireUser("/chu-san/moi");
  const owned = await db.venue.findMany({ where: { ownerId: user.id }, select: { plan: true } });
  if (owned.length >= PLAN_LIMITS.FREE.venues && !owned.some((v) => v.plan === "PRO"))
    fail("/chu-san/moi", "Gói miễn phí chỉ quản lý 1 cụm sân. Nâng cấp Pro để thêm cụm sân.");
  const data = venueFields(form, "/chu-san/moi");
  let slug = slugify(`${data.name} ${data.district}`);
  if (await db.venue.findUnique({ where: { slug } })) slug = `${slug}-${randomCode(4).toLowerCase()}`;
  const venue = await db.venue.create({ data: { ...data, slug, ownerId: user.id } });
  const admins = await db.user.findMany({ where: { role: "ADMIN" } });
  await db.notification.createMany({ data: admins.map((a) => ({ userId: a.id, title: "Sân mới chờ duyệt", body: venue.name, link: "/quan-tri/san?status=PENDING" })) });
  redirect(`/chu-san/${venue.id}/cai-dat?ok=${encodeURIComponent("Đã tạo cụm sân! Thêm sân con và bảng giá, rồi chờ duyệt.")}`);
}

async function ownerAccess(venueId: string, back: string) {
  const user = await requireUser(back);
  const access = await getVenueAccess(venueId, user);
  if (!access?.isOwner) fail("/chu-san", "Bạn không có quyền quản lý cài đặt sân này");
  return { user, venue: access.venue };
}

export async function updateVenueAction(venueId: string, form: FormData) {
  const back = `/chu-san/${venueId}/cai-dat`;
  await ownerAccess(venueId, back);
  await db.venue.update({ where: { id: venueId }, data: venueFields(form, back) });
  done(back, "Đã lưu thông tin sân");
}

export async function updatePolicyAction(venueId: string, form: FormData) {
  const back = `/chu-san/${venueId}/cai-dat`;
  await ownerAccess(venueId, back);
  const depositType = str(form, "depositType");
  await db.venue.update({
    where: { id: venueId },
    data: {
      autoConfirm: bool(form, "autoConfirm"),
      depositType: isKey(DEPOSIT_TYPES, depositType) ? depositType : "NONE",
      depositValue: Math.max(0, int(form, "depositValue")),
      cancelHours: Math.min(72, Math.max(0, int(form, "cancelHours", 12))),
      pendingExpireMin: Math.min(1440, Math.max(0, int(form, "pendingExpireMin", 120))),
    },
  });
  done(back, "Đã lưu chính sách đặt sân");
}

export async function addPitchAction(venueId: string, form: FormData) {
  const back = `/chu-san/${venueId}/cai-dat`;
  const { venue } = await ownerAccess(venueId, back);
  const count = await db.pitch.count({ where: { venueId } });
  if (venue.plan === "FREE" && count >= PLAN_LIMITS.FREE.pitches) fail(back, `Gói miễn phí tối đa ${PLAN_LIMITS.FREE.pitches} sân con. Nâng cấp Pro để thêm.`);
  const size = str(form, "size");
  const surface = str(form, "surface");
  const name = str(form, "name") || `Sân ${count + 1}`;
  await db.pitch.create({
    data: {
      venueId, name, sortOrder: count,
      size: isKey(PITCH_SIZES, size) ? size : "5",
      surface: isKey(SURFACES, surface) ? surface : "ARTIFICIAL",
      covered: bool(form, "covered"),
    },
  });
  done(back, `Đã thêm ${name}`);
}

export async function togglePitchAction(venueId: string, pitchId: string) {
  const back = `/chu-san/${venueId}/cai-dat`;
  await ownerAccess(venueId, back);
  const pitch = await db.pitch.findFirst({ where: { id: pitchId, venueId } });
  if (!pitch) fail(back, "Không tìm thấy sân con");
  await db.pitch.update({ where: { id: pitchId }, data: { active: !pitch.active } });
  done(back, pitch.active ? `Đã tạm ẩn ${pitch.name}` : `Đã mở lại ${pitch.name}`);
}

export async function linkPitchesAction(venueId: string, form: FormData) {
  const back = `/chu-san/${venueId}/cai-dat`;
  await ownerAccess(venueId, back);
  const parentId = str(form, "parentId");
  const childIds = form.getAll("childIds").map(String);
  const pitches = await db.pitch.findMany({ where: { venueId, id: { in: [parentId, ...childIds] } } });
  if (!pitches.find((p) => p.id === parentId) || childIds.length < 2 || childIds.includes(parentId)) fail(back, "Chọn 1 sân lớn và ít nhất 2 sân nhỏ ghép thành");
  if (pitches.length !== childIds.length + 1) fail(back, "Sân không hợp lệ");
  await db.$transaction([
    db.pitchLink.deleteMany({ where: { parentId } }),
    ...childIds.map((childId) => db.pitchLink.create({ data: { parentId, childId } })),
  ]);
  done(back, "Đã lưu sân ghép");
}

export async function unlinkPitchAction(venueId: string, parentId: string) {
  const back = `/chu-san/${venueId}/cai-dat`;
  await ownerAccess(venueId, back);
  await db.pitchLink.deleteMany({ where: { parentId, parent: { venueId } } });
  done(back, "Đã bỏ sân ghép");
}
