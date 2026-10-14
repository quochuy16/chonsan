import type { PrismaClient } from "@prisma/client";
import type { Users } from "./seed";
import { addDays, fromVN, todayKey } from "../src/lib/domain/time";

/** Kèo tìm đối + tìm người đá ghép. Kèo gắn với người đăng; tên đội chỉ là chữ. */
export async function seedMatches(db: PrismaClient, u: Users) {
  const today = todayKey();
  // Kèo đã đá xong, hai bên đánh giá nhau
  const past = await db.matchPost.create({ data: { authorId: u.captain2.id, teamName: "FC Bia Hơi Đống Đa", start: fromVN(addDays(today, -7), 19 * 60 + 30), venueText: "Sân bóng Xanh Đống Đa", pitchSize: "7", province: "Hà Nội", district: "Đống Đa", status: "MATCHED" } });
  await db.matchRequest.create({ data: { postId: past.id, userId: u.player.id, teamName: "FC Văn Phòng Cầu Giấy", status: "ACCEPTED", message: "Đội mình nhận nhé" } });
  await db.matchRating.create({ data: { matchPostId: past.id, fromUserId: u.player.id, toUserId: u.captain2.id, punctual: 5, fairplay: 4, levelMatch: 4, comment: "Đá vui, đúng giờ" } });
  await db.matchRating.create({ data: { matchPostId: past.id, fromUserId: u.captain2.id, toUserId: u.player.id, punctual: 4, fairplay: 5, levelMatch: 3, comment: "Đội bạn mạnh hơn khai báo một chút" } });

  // Kèo đang mở
  const open1 = await db.matchPost.create({ data: { authorId: u.captain2.id, teamName: "FC Bia Hơi Đống Đa", start: fromVN(addDays(today, 1), 19 * 60 + 30), venueText: "Sân Hồ Tây Arena (đã đặt)", pitchSize: "7", province: "Hà Nội", district: "Tây Hồ", level: "TRUNG_BINH", costSplit: "HALF", note: "Đá vui vẻ, áo xanh lá. Có nước miễn phí." } });
  await db.matchRequest.create({ data: { postId: open1.id, userId: u.owner2.id, teamName: "Sài Gòn United", message: "Bọn mình ra Hà Nội công tác, xin một kèo!" } });
  await db.matchPost.create({ data: { authorId: u.player.id, teamName: "FC Văn Phòng Cầu Giấy", start: fromVN(addDays(today, 4), 20 * 60), venueText: "Sân bóng Xanh Đống Đa – Sân 7", pitchSize: "7", province: "Hà Nội", district: "Đống Đa", level: "KHA", costSplit: "HOST", note: "Đội mình trả sân, cần đối trình khá." } });
  await db.matchPost.create({ data: { authorId: u.owner2.id, teamName: "Sài Gòn United", start: fromVN(addDays(today, 3), 18 * 60), venueText: "Sân bóng Bình Minh Quận 11", pitchSize: "5", province: "TP. Hồ Chí Minh", district: "Quận 11", level: "MANH", costSplit: "HALF" } });

  // Tìm người đá ghép
  const pp = await db.playerPost.create({ data: { authorId: u.player.id, teamName: "FC Văn Phòng Cầu Giấy", start: fromVN(addDays(today, 2), 19 * 60 + 30), venueText: "Sân bóng Xanh Đống Đa", province: "Hà Nội", district: "Đống Đa", needed: 2, position: "Hậu vệ", feePerPerson: 80000, level: "KHA", note: "Thiếu 2 hậu vệ, đá sân 7." } });
  await db.playerRequest.create({ data: { postId: pp.id, userId: u.captain2.id, message: "Mình đá hậu vệ trái được" } });
  await db.playerPost.create({ data: { authorId: u.captain2.id, start: fromVN(addDays(today, 1), 19 * 60 + 30), venueText: "Sân Hồ Tây Arena", province: "Hà Nội", district: "Tây Hồ", needed: 1, position: "Thủ môn", feePerPerson: 0, note: "Cần gấp 1 thủ môn, miễn phí tiền sân." } });

  await db.report.create({ data: { reporterId: u.player.id, targetType: "MATCH_POST", targetId: open1.id, reason: "OTHER", detail: "(Dữ liệu mẫu) Kiểm tra giúp bài này." } });
  await db.notification.createMany({ data: [
    { userId: u.player.id, title: "Có kèo mới quanh bạn", link: "/keo" },
    { userId: u.captain2.id, title: "Sài Gòn United muốn nhận kèo của bạn", link: `/keo/${open1.id}` },
  ] });
}
