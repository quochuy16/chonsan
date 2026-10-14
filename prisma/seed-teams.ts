import type { PrismaClient } from "@prisma/client";
import type { Users } from "./seed";
import { rand } from "./seed-utils";
import { addDays, formatMonthKey, fromVN, todayKey, vnMonthKey } from "../src/lib/domain/time";
import { splitEvenly } from "../src/lib/domain/fund";


export async function seedTeams(db: PrismaClient, u: Users) {
  const today = todayKey();
  const bank = { bankBin: "970422", bankAccount: "0987000001", bankAccountName: "NGUYEN MINH DUC" };
  const teamA = await db.team.create({
    data: {
      slug: "fc-van-phong-cau-giay", name: "FC Văn Phòng Cầu Giấy", province: "Hà Nội", district: "Cầu Giấy", level: "KHA", inviteCode: "VANPHONG",
      homeVenue: "Sân bóng Xanh Đống Đa, tối thứ 3", description: "Anh em dân văn phòng khu Cầu Giấy, đá vui khỏe, giao lưu là chính.", monthlyFee: 200000, ...bank,
    },
  });
  const teamB = await db.team.create({ data: { slug: "fc-bia-hoi-dong-da", name: "FC Bia Hơi Đống Đa", province: "Hà Nội", district: "Đống Đa", level: "TRUNG_BINH", inviteCode: "BIAHOI01", homeVenue: "Sân Hồ Tây Arena" } });
  const teamC = await db.team.create({ data: { slug: "sai-gon-united", name: "Sài Gòn United", province: "TP. Hồ Chí Minh", district: "Quận 11", level: "MANH", inviteCode: "SAIGON01" } });

  const mA = [
    await db.teamMember.create({ data: { teamId: teamA.id, userId: u.player.id, displayName: u.player.name, role: "CAPTAIN", jerseyNo: 10 } }),
    await db.teamMember.create({ data: { teamId: teamA.id, userId: u.others[0].id, displayName: u.others[0].name, role: "TREASURER", jerseyNo: 4 } }),
    ...(await Promise.all(u.others.slice(1, 6).map((o, i) => db.teamMember.create({ data: { teamId: teamA.id, userId: o.id, displayName: o.name, jerseyNo: 5 + i } })))),
    await db.teamMember.create({ data: { teamId: teamA.id, displayName: "Hiếu (bạn Long)", jerseyNo: 17 } }),
    await db.teamMember.create({ data: { teamId: teamA.id, displayName: "Tuấn Anh thủ môn", jerseyNo: 1 } }),
  ];
  await db.teamMember.create({ data: { teamId: teamB.id, userId: u.captain2.id, displayName: u.captain2.name, role: "CAPTAIN" } });
  for (const o of u.others.slice(6)) await db.teamMember.create({ data: { teamId: teamB.id, userId: o.id, displayName: o.name } });
  await db.teamMember.create({ data: { teamId: teamC.id, userId: u.owner2.id, displayName: u.owner2.name, role: "CAPTAIN" } });

  const by = u.player.id;
  const tx = (data: Record<string, unknown>) => db.fundTransaction.create({ data: { teamId: teamA.id, createdById: by, ...data } as never });
  // Quỹ tháng trước và tháng này
  for (const offset of [-35, 0]) {
    const d = fromVN(addDays(today, offset), 12 * 60);
    const note = `Quỹ ${formatMonthKey(vnMonthKey(d))}`;
    for (const m of mA) {
      await tx({ kind: "CHARGE", category: "MONTHLY", memberId: m.id, amount: 200000, note, date: d });
      if (offset < 0 ? rand() < 0.9 : rand() < 0.5) await tx({ kind: "PAYMENT", memberId: m.id, amount: 200000, note: "Chuyển khoản", date: d });
    }
  }
  await tx({ kind: "EXPENSE", category: "KIT", amount: 2400000, note: "In 12 bộ áo đấu", date: fromVN(addDays(today, -40), 12 * 60) });
  await tx({ kind: "EXPENSE", category: "BALL", amount: 650000, note: "2 quả bóng Động Lực", date: fromVN(addDays(today, -20), 12 * 60) });
  await tx({ kind: "INCOME", category: "SPONSOR", amount: 1000000, note: "Anh Long tài trợ", date: fromVN(addDays(today, -38), 12 * 60) });

  // 5 buổi đá đã chốt (mỗi tuần), chia tiền sân cho người có mặt
  const opponents = ["FC Bia Hơi Đống Đa", "FC Ngân Hàng", "", "FC Láng Hạ", "FC Kiến Trúc"];
  for (let w = 5; w >= 1; w--) {
    const start = fromVN(addDays(today, -7 * w), 19 * 60 + 30);
    const present = mA.filter(() => rand() < 0.8);
    const cost = 1200000;
    const sf = Math.floor(rand() * 6), sa = Math.floor(rand() * 5);
    const ev = await db.teamEvent.create({ data: { teamId: teamA.id, title: "Đá tối thứ 3", start, venueText: "Sân bóng Xanh Đống Đa", opponent: opponents[w - 1], cost, scoreFor: sf, scoreAgainst: sa, finished: true, chargesIssued: true } });
    let goalsLeft = sf;
    for (const m of mA) {
      const att = present.includes(m);
      const g = att && goalsLeft > 0 && rand() < 0.4 ? 1 : 0;
      goalsLeft -= g;
      await db.attendance.create({ data: { eventId: ev.id, memberId: m.id, response: att ? "YES" : "NO", attended: att, goals: g, assists: att && rand() < 0.2 ? 1 : 0 } });
    }
    const share = splitEvenly(cost, present.length);
    for (const m of present) {
      await tx({ kind: "CHARGE", category: "MATCH", memberId: m.id, amount: share, note: `Đá tối thứ 3 tuần -${w}`, eventId: ev.id, date: start });
      if (w > 1 || rand() < 0.5) await tx({ kind: "PAYMENT", memberId: m.id, amount: share, note: "Tiền trận", date: start });
    }
    await tx({ kind: "EXPENSE", category: "PITCH", amount: cost, note: `Tiền sân tuần -${w}`, eventId: ev.id, date: start });
  }
  await db.fundAuditLog.createMany({ data: [
    { teamId: teamA.id, actorName: u.others[0].name, action: "Thu quỹ tháng", detail: `${mA.length} người × 200.000đ` },
    { teamId: teamA.id, actorName: u.player.name, action: "Chia tiền trận", detail: "Đá tối thứ 3: 1.200.000đ" },
  ] });
  // Buổi đá sắp tới, có người đã điểm danh
  const next = await db.teamEvent.create({ data: { teamId: teamA.id, title: "Đá tối thứ 3", start: fromVN(addDays(today, 2), 19 * 60 + 30), venueText: "Sân bóng Xanh Đống Đa", cost: 1200000 } });
  for (const m of mA.slice(0, 6)) await db.attendance.create({ data: { eventId: next.id, memberId: m.id, response: rand() < 0.75 ? "YES" : "MAYBE" } });

  await seedMatches(db, u, { teamA: teamA.id, teamB: teamB.id, teamC: teamC.id });
}

async function seedMatches(db: PrismaClient, u: Users, t: { teamA: string; teamB: string; teamC: string }) {
  const today = todayKey();
  // Kèo đã đá xong, hai đội đánh giá nhau
  const past = await db.matchPost.create({ data: { teamId: t.teamB, authorId: u.captain2.id, start: fromVN(addDays(today, -7), 19 * 60 + 30), venueText: "Sân bóng Xanh Đống Đa", pitchSize: "7", province: "Hà Nội", district: "Đống Đa", status: "MATCHED" } });
  await db.matchRequest.create({ data: { postId: past.id, teamId: t.teamA, status: "ACCEPTED", message: "Đội mình nhận nhé" } });
  await db.teamRating.create({ data: { matchPostId: past.id, fromTeamId: t.teamA, toTeamId: t.teamB, punctual: 5, fairplay: 4, levelMatch: 4, comment: "Đá vui, đúng giờ" } });
  await db.teamRating.create({ data: { matchPostId: past.id, fromTeamId: t.teamB, toTeamId: t.teamA, punctual: 4, fairplay: 5, levelMatch: 3, comment: "Đội bạn mạnh hơn khai báo một chút" } });

  // Kèo đang mở
  const open1 = await db.matchPost.create({ data: { teamId: t.teamB, authorId: u.captain2.id, start: fromVN(addDays(today, 1), 19 * 60 + 30), venueText: "Sân Hồ Tây Arena (đã đặt)", pitchSize: "7", province: "Hà Nội", district: "Tây Hồ", level: "TRUNG_BINH", costSplit: "HALF", note: "Đá vui vẻ, áo xanh lá. Có nước miễn phí." } });
  await db.matchRequest.create({ data: { postId: open1.id, teamId: t.teamC, message: "Bọn mình ra Hà Nội công tác, xin một kèo!" } });
  await db.matchPost.create({ data: { teamId: t.teamA, authorId: u.player.id, start: fromVN(addDays(today, 4), 20 * 60), venueText: "Sân bóng Xanh Đống Đa – Sân 7", pitchSize: "7", province: "Hà Nội", district: "Đống Đa", level: "KHA", costSplit: "HOST", note: "Đội mình trả sân, cần đối trình khá." } });
  await db.matchPost.create({ data: { teamId: t.teamC, authorId: u.owner2.id, start: fromVN(addDays(today, 3), 18 * 60), venueText: "Sân bóng Bình Minh Quận 11", pitchSize: "5", province: "TP. Hồ Chí Minh", district: "Quận 11", level: "MANH", costSplit: "HALF" } });

  // Tìm người đá ghép
  const pp = await db.playerPost.create({ data: { authorId: u.player.id, teamId: t.teamA, start: fromVN(addDays(today, 2), 19 * 60 + 30), venueText: "Sân bóng Xanh Đống Đa", province: "Hà Nội", district: "Đống Đa", needed: 2, position: "Hậu vệ", feePerPerson: 80000, level: "KHA", note: "Thiếu 2 hậu vệ, đá sân 7." } });
  await db.playerRequest.create({ data: { postId: pp.id, userId: u.captain2.id, message: "Mình đá hậu vệ trái được" } });
  await db.playerPost.create({ data: { authorId: u.captain2.id, teamId: t.teamB, start: fromVN(addDays(today, 1), 19 * 60 + 30), venueText: "Sân Hồ Tây Arena", province: "Hà Nội", district: "Tây Hồ", needed: 1, position: "Thủ môn", feePerPerson: 0, note: "Cần gấp 1 thủ môn, miễn phí tiền sân." } });

  await db.report.create({ data: { reporterId: u.player.id, targetType: "MATCH_POST", targetId: open1.id, reason: "OTHER", detail: "(Dữ liệu mẫu) Kiểm tra giúp bài này." } });
  await db.notification.createMany({ data: [
    { userId: u.player.id, title: "FC Bia Hơi Đống Đa muốn nhận kèo? Xem kèo mới quanh bạn", link: "/keo" },
    { userId: u.captain2.id, title: "Sài Gòn United muốn nhận kèo của bạn", link: `/keo/${open1.id}` },
  ] });
}
