/* Dữ liệu mẫu cho môi trường local. Tên sân/đội/người đều là hư cấu. */
// Chạy `npm run db:reset` (do người dùng tự chạy) để tạo lại DB và nạp dữ liệu này.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { pick } from "./seed-utils";
import { seedVenues } from "./seed-venues";
import { seedMatches } from "./seed-matches";

export const db = new PrismaClient();
/** Mật khẩu chung cho mọi tài khoản mẫu (chỉ dùng ở local) */
export const DEMO_PASSWORD = "chonsan123";


async function seedUsers() {
  await db.$transaction([
    db.report.deleteMany(), db.matchRating.deleteMany(), db.matchRequest.deleteMany(), db.matchPost.deleteMany(),
    db.playerRequest.deleteMany(), db.playerPost.deleteMany(), db.review.deleteMany(), db.booking.deleteMany(), db.deal.deleteMany(), db.venueHoliday.deleteMany(), db.priceRule.deleteMany(), db.pitchLink.deleteMany(),
    db.pitch.deleteMany(), db.venueStaff.deleteMany(), db.venue.deleteMany(), db.notification.deleteMany(), db.user.deleteMany(),
  ]);
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const mkUser = (email: string, name: string, phone: string, extra: object = {}) =>
    db.user.create({ data: { email, name, phone, passwordHash, ...extra } });

  const admin = await mkUser("admin@chonsan.local", "Quản trị ChonSan", "0900000000", { role: "ADMIN" });
  const owner = await mkUser("chusan@chonsan.local", "Trần Văn Sân", "0912000001", { province: "Hà Nội", district: "Đống Đa" });
  const owner2 = await mkUser("chusan2@chonsan.local", "Lê Thị Cỏ", "0912000002", { province: "TP. Hồ Chí Minh", district: "Quận 11" });
  const staff = await mkUser("nhanvien@chonsan.local", "Phạm Nhân Viên", "0912000003");
  const player = await mkUser("nguoichoi@chonsan.local", "Nguyễn Minh Đức", "0987000001", { province: "Hà Nội", district: "Cầu Giấy", skillLevel: "KHA", position: "Tiền vệ" });
  const captain2 = await mkUser("doitruong2@chonsan.local", "Hoàng Văn Bia", "0987000002", { province: "Hà Nội", district: "Đống Đa", skillLevel: "TRUNG_BINH" });
  const others = await Promise.all(
    ["Vũ Thành Long", "Đỗ Quang Hải", "Bùi Tiến Dũng", "Phan Văn Toàn", "Ngô Đình Trọng", "Lý Công Phượng", "Mai Xuân Trường", "Tạ Văn Hậu"]
      .map((n, i) => mkUser(`thanhvien${i + 1}@chonsan.local`, n, `09870001${String(i + 10)}`, { province: "Hà Nội", district: "Cầu Giấy", skillLevel: pick(["TRUNG_BINH", "KHA"]) })),
  );
  return { admin, owner, owner2, staff, player, captain2, others };
}

export type Users = Awaited<ReturnType<typeof seedUsers>>;

async function main() {
  const users = await seedUsers();
  await seedVenues(db, users);
  await seedMatches(db, users);
  console.log(`✔ Đã nạp dữ liệu mẫu. Mật khẩu mọi tài khoản: xem DEMO_PASSWORD trong prisma/seed.ts`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
