import type { PrismaClient } from "@prisma/client";
import type { Users } from "./seed";
import { bookingCode, pick, rand } from "./seed-utils";
import { addDays, fromVN, todayKey } from "../src/lib/domain/time";
import { depositFor, parseDays, quote } from "../src/lib/domain/pricing";
import { conflictingPitchIds } from "../src/lib/domain/schedule";
import { slugify } from "../src/lib/domain/text";

const WEEKDAY = "1,2,3,4,5", WEEKEND = "0,6";

const VENUES = [
  { key: "xanh", name: "Sân bóng Xanh Đống Đa", address: "12 ngõ Thịnh Hào 1, Hàng Bột", province: "Hà Nội", district: "Đống Đa", lat: 21.0215, lng: 105.8262, plan: "PRO", verified: true, owner: "owner", sizes: ["5", "5", "5", "7"], link: true, base: 300000, peak: 500000, desc: "4 sân cỏ nhân tạo mới thay 2025, đèn LED, có căng tin và chỗ gửi xe máy rộng." },
  { key: "tayho", name: "Sân Hồ Tây Arena", address: "88 Lạc Long Quân, Bưởi", province: "Hà Nội", district: "Tây Hồ", lat: 21.0602, lng: 105.8125, plan: "FREE", verified: true, owner: "owner", sizes: ["7", "7"], link: false, base: 600000, peak: 900000, desc: "Sân 7 người view hồ, mặt cỏ êm, có phòng thay đồ." },
  { key: "bachkhoa", name: "Sân bóng Sinh Viên Bách Khoa", address: "Ngõ 40 Tạ Quang Bửu", province: "Hà Nội", district: "Hai Bà Trưng", lat: 21.0021, lng: 105.8466, plan: "FREE", verified: false, owner: "owner2", sizes: ["5", "5"], link: false, base: 250000, peak: 400000, desc: "Giá sinh viên, gần các trường đại học." },
  { key: "mydinh", name: "Sân cỏ Mỹ Đình Xanh", address: "Đường Lê Đức Thọ, Mỹ Đình 2", province: "Hà Nội", district: "Nam Từ Liêm", lat: 21.0287, lng: 105.7672, plan: "FREE", verified: true, owner: "owner2", sizes: ["5", "7"], link: false, base: 350000, peak: 650000, desc: "Gần sân vận động Mỹ Đình, nhiều chỗ đỗ ô tô." },
  { key: "caugiay", name: "Cầu Giấy Football Park", address: "15 Trần Thái Tông, Dịch Vọng Hậu", province: "Hà Nội", district: "Cầu Giấy", lat: 21.0335, lng: 105.7905, plan: "FREE", verified: false, owner: "owner2", sizes: ["5", "5"], link: false, base: 320000, peak: 520000, desc: "Sân mới khai trương.", status: "PENDING" },
  { key: "q11", name: "Sân bóng Bình Minh Quận 11", address: "219 Lý Thường Kiệt, Phường 15", province: "TP. Hồ Chí Minh", district: "Quận 11", lat: 10.7697, lng: 106.6573, plan: "PRO", verified: true, owner: "owner2", sizes: ["5", "5", "7"], link: false, base: 280000, peak: 450000, desc: "Cụm sân trung tâm Sài Gòn, mở tới 24h." },
  { key: "q7", name: "Sân Phú Mỹ Hưng Sports", address: "Nguyễn Lương Bằng, Tân Phú", province: "TP. Hồ Chí Minh", district: "Quận 7", lat: 10.7296, lng: 106.7186, plan: "FREE", verified: true, owner: "owner2", sizes: ["7", "7"], link: false, base: 650000, peak: 950000, desc: "Sân 7 tiêu chuẩn, có mái che khán đài." },
  { key: "danang", name: "Sân bóng Biển Xanh Đà Nẵng", address: "Võ Nguyên Giáp, Phước Mỹ", province: "Đà Nẵng", district: "Sơn Trà", lat: 16.0678, lng: 108.2455, plan: "FREE", verified: true, owner: "owner2", sizes: ["5", "5", "7"], link: false, base: 250000, peak: 400000, desc: "Gần biển Mỹ Khê, chiều mát." },
] as const;

const BANK = { bankBin: "970436", bankAccount: "0011004567890", bankAccountName: "TRAN VAN SAN" };

export async function seedVenues(db: PrismaClient, u: Users) {
  const created: Record<string, { id: string; pitches: { id: string; name: string; size: string }[] }> = {};
  for (const v of VENUES) {
    const venue = await db.venue.create({
      data: {
        slug: slugify(v.name),
        ownerId: v.owner === "owner" ? u.owner.id : u.owner2.id, name: v.name, address: v.address, province: v.province, district: v.district,
        lat: v.lat, lng: v.lng, description: v.desc, phone: v.owner === "owner" ? u.owner.phone : u.owner2.phone,
        openMin: 330, closeMin: v.key === "q11" ? 1440 : 1380, amenities: "PARKING,WATER,LIGHTS,BIB" + (v.plan === "PRO" ? ",CANTEEN,CHANGING_ROOM" : ""),
        status: "status" in v ? v.status : "APPROVED", verified: v.verified, plan: v.plan,
        pendingExpireMin: v.key === "xanh" ? 0 : 120, // sân demo chính giữ đơn chờ để thử nút xác nhận
        autoConfirm: v.key !== "xanh", depositType: v.key === "xanh" ? "PERCENT" : "NONE", depositValue: v.key === "xanh" ? 30 : 0, cancelHours: 12,
        ...BANK,
      },
    });
    const pitches = [];
    let n5 = 0;
    for (const [i, size] of v.sizes.entries()) {
      const name = size === "7" && v.link ? "Sân 7 (ghép 1+2)" : `Sân ${size === "5" ? ++n5 : String.fromCharCode(65 + i)}`;
      pitches.push(await db.pitch.create({ data: { venueId: venue.id, name, size, sortOrder: i, covered: v.plan === "PRO" && i === 0 } }));
    }
    if (v.link) {
      const big = pitches.find((p) => p.size === "7")!;
      for (const c of pitches.filter((p) => p.size === "5").slice(0, 2)) await db.pitchLink.create({ data: { parentId: big.id, childId: c.id } });
    }
    const rules: { pitchId: string | null; daysOfWeek: string; startMin: number; endMin: number; pricePerHour: number }[] = [
      { pitchId: null, daysOfWeek: WEEKDAY, startMin: 330, endMin: 960, pricePerHour: v.base },
      { pitchId: null, daysOfWeek: WEEKDAY, startMin: 960, endMin: 1440, pricePerHour: v.peak },
      { pitchId: null, daysOfWeek: WEEKEND, startMin: 330, endMin: 1440, pricePerHour: v.peak + 50000 },
    ];
    // Sân 7 trong cụm có cả sân 5: giá riêng
    const sizes: readonly string[] = v.sizes;
    if (sizes.includes("5") && sizes.includes("7")) {
      for (const p of pitches.filter((x) => x.size === "7")) {
        rules.push({ pitchId: p.id, daysOfWeek: WEEKDAY, startMin: 330, endMin: 960, pricePerHour: v.base * 2 });
        rules.push({ pitchId: p.id, daysOfWeek: WEEKDAY, startMin: 960, endMin: 1440, pricePerHour: v.peak * 2 });
        rules.push({ pitchId: p.id, daysOfWeek: WEEKEND, startMin: 330, endMin: 1440, pricePerHour: (v.peak + 50000) * 2 });
      }
    }
    await db.priceRule.createMany({ data: rules.map((r) => ({ ...r, venueId: venue.id })) });
    created[v.key] = { id: venue.id, pitches };
  }
  const main = created.xanh;
  await db.venueStaff.create({ data: { venueId: main.id, userId: u.staff.id } });
  await db.venueHoliday.create({ data: { venueId: main.id, date: "2027-01-01", name: "Tết Dương lịch", percent: 130 } });
  const today = todayKey();
  await db.deal.create({ data: { venueId: main.id, start: fromVN(today, 14 * 60), end: fromVN(today, 16 * 60), percent: 30 } });
  await seedBookings(db, u, main.id);
  return created;
}

const WALK_INS = [["Anh Tuấn", "0901234501"], ["Chị Hoa (công ty ABC)", "0901234502"], ["Hùng FC Thịnh Quang", "0901234503"], ["Nam béo", "0901234504"], ["Team IT Láng Hạ", "0901234505"], ["Anh Khoa", "0901234506"]];
const COMMENTS = ["Cỏ đẹp, đèn sáng, chủ sân nhiệt tình", "Giá hợp lý, sẽ quay lại", "Hơi khó gửi xe giờ cao điểm", "Sân mới, bóng tốt", ""];

async function seedBookings(db: PrismaClient, u: Users, venueId: string) {
  const venue = await db.venue.findUniqueOrThrow({ where: { id: venueId }, include: { pitches: true, priceRules: true } });
  const links = await db.pitchLink.findMany({ where: { parent: { venueId } } });
  const rules = venue.priceRules.map((r) => ({ ...r, daysOfWeek: parseDays(r.daysOfWeek) }));
  const today = todayKey();
  const now = Date.now();
  const players = [u.player, u.captain2, ...u.others];
  const taken: { pitchId: string; s: number; e: number }[] = [];
  for (let d = -30; d <= 6; d++) {
    const day = addDays(today, d);
    const dow = new Date(fromVN(day, 12 * 60).getTime() + 7 * 3600_000).getUTCDay();
    const slots = dow === 0 || dow === 6 ? [7 * 60, 8 * 60 + 30, 15 * 60, 17 * 60, 18 * 60 + 30, 20 * 60] : [17 * 60, 18 * 60 + 30, 20 * 60];
    for (const pitch of [...venue.pitches].sort((a, b) => (a.size === "7" ? -1 : 1) - (b.size === "7" ? -1 : 1))) {
      for (const sm of slots) {
        const isPast = fromVN(day, sm).getTime() < now;
        if (rand() > (isPast ? 0.55 : 0.35) * (pitch.size === "7" ? 0.6 : 1)) continue;
        const s = fromVN(day, sm).getTime(), e = s + 90 * 60_000;
        const ids = conflictingPitchIds(pitch.id, links);
        if (taken.some((t) => ids.includes(t.pitchId) && t.s < e && s < t.e)) continue;
        taken.push({ pitchId: pitch.id, s, e });
        const q = quote({ rules, pitchId: pitch.id, dow, startMin: sm, endMin: sm + 90 });
        const online = rand() < 0.6;
        const who = online ? pick(players) : null;
        const [wn, wp] = pick(WALK_INS);
        const r = rand();
        const status = isPast ? (r < 0.88 ? "COMPLETED" : r < 0.94 ? "NO_SHOW" : "CANCELLED") : r < 0.75 ? "CONFIRMED" : "PENDING";
        const total = q.ok ? q.total : 0;
        const b = await db.booking.create({
          data: {
            code: bookingCode(), pitchId: pitch.id, userId: who?.id ?? null, customerName: who?.name ?? wn, customerPhone: who?.phone ?? wp,
            start: new Date(s), end: new Date(e), totalPrice: total, depositAmount: depositFor(total, venue.depositType, venue.depositValue),
            depositPaid: isPast || status === "CONFIRMED", status, source: online ? "ONLINE" : "MANUAL",
            cancelledAt: status === "CANCELLED" ? new Date(s - 86400_000) : null,
          },
        });
        if (who && status === "COMPLETED" && rand() < 0.35) {
          await db.review.create({ data: { venueId, userId: who.id, bookingId: b.id, rating: pick([5, 5, 4, 4, 3]), comment: pick(COMMENTS) } });
        }
      }
    }
  }
  // Đơn chờ xác nhận của người chơi mẫu (để chủ sân thấy ngay)
  const tomorrow = addDays(today, 1);
  const p5 = venue.pitches.find((p) => p.name === "Sân 3")!;
  const sm = 21 * 60 + 30;
  const s = fromVN(tomorrow, sm).getTime();
  if (!taken.some((t) => t.pitchId === p5.id && t.s < s + 5400_000 && s < t.e)) {
    const q = quote({ rules, pitchId: p5.id, dow: new Date(s + 7 * 3600_000).getUTCDay(), startMin: sm, endMin: sm + 60 });
    await db.booking.create({ data: { code: "CSDEMO01", pitchId: p5.id, userId: u.player.id, customerName: u.player.name, customerPhone: u.player.phone, start: new Date(s), end: new Date(s + 3600_000), totalPrice: q.total, depositAmount: depositFor(q.total, "PERCENT", 30), status: "PENDING", note: "Cho mình mượn thêm 1 quả bóng nhé" } });
    await db.notification.create({ data: { userId: u.owner.id, title: "Đơn đặt sân chờ xác nhận", body: `${u.player.name} đặt Sân 3 21:30 ngày mai`, link: `/chu-san/${venueId}` } });
  }
}
