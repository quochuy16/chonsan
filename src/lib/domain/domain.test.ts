import { describe, expect, it } from "vitest";
import { addDays, dowOfKey, formatTime, fromVN, vnDateKey, vnParts } from "./time";
import { formatVND } from "./money";
import { depositFor, hourlyPriceAt, quote, type PriceRuleInput } from "./pricing";
import { canCustomerCancel, canTransition, conflictingPitchIds, overlaps } from "./schedule";
import { computeReputation } from "./reputation";
import { buildVietQR, crc16, sanitizeTransferNote } from "./vietqr";
import { normalizePhone, slugify } from "./text";

describe("time (giờ VN)", () => {
  it("fromVN và vnParts khớp nhau quanh nửa đêm UTC", () => {
    const d = fromVN("2026-10-13", 6 * 60 + 30); // 06:30 VN = 23:30 UTC hôm trước
    expect(d.toISOString()).toBe("2026-10-12T23:30:00.000Z");
    expect(vnDateKey(d)).toBe("2026-10-13");
    expect(formatTime(d)).toBe("06:30");
    expect(vnParts(d).dow).toBe(2); // Thứ 3
  });
  it("addDays qua tháng", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(dowOfKey("2026-10-18")).toBe(0);
  });
});

describe("money", () => {
  it("định dạng VND", () => {
    expect(formatVND(500000)).toBe("500.000đ");
    expect(formatVND(1250000)).toBe("1.250.000đ");
  });
});

describe("pricing", () => {
  const weekdays = [1, 2, 3, 4, 5];
  const rules: PriceRuleInput[] = [
    { pitchId: null, daysOfWeek: weekdays, startMin: 6 * 60, endMin: 17 * 60, pricePerHour: 300000 },
    { pitchId: null, daysOfWeek: weekdays, startMin: 17 * 60, endMin: 22 * 60, pricePerHour: 500000 },
    { pitchId: "p7", daysOfWeek: weekdays, startMin: 17 * 60, endMin: 22 * 60, pricePerHour: 900000 },
  ];
  it("rule riêng của sân con thắng rule chung", () => {
    expect(hourlyPriceAt(rules, "p5", 2, 18 * 60)).toBe(500000);
    expect(hourlyPriceAt(rules, "p7", 2, 18 * 60)).toBe(900000);
  });
  it("đơn vắt qua hai khung giá", () => {
    const q = quote({ rules, pitchId: "p5", dow: 2, startMin: 16 * 60, endMin: 18 * 60 });
    expect(q.ok).toBe(true);
    expect(q.total).toBe(800000);
  });
  it("không có giá thì không cho đặt", () => {
    const q = quote({ rules, pitchId: "p5", dow: 6, startMin: 8 * 60, endMin: 9 * 60 });
    expect(q.ok).toBe(false);
  });
  it("ngày lễ và giảm giá giờ trống", () => {
    const holiday = quote({ rules, pitchId: "p5", dow: 2, startMin: 18 * 60, endMin: 19 * 60, holidayPercent: 120 });
    expect(holiday.total).toBe(600000);
    const deal = quote({
      rules, pitchId: "p5", dow: 2, startMin: 18 * 60, endMin: 20 * 60,
      deals: [{ startMin: 19 * 60, endMin: 20 * 60, percent: 30 }],
    });
    expect(deal.total).toBe(850000);
    expect(deal.discount).toBe(150000);
  });
  it("cọc", () => {
    expect(depositFor(500000, "NONE", 0)).toBe(0);
    expect(depositFor(500000, "FIXED", 200000)).toBe(200000);
    expect(depositFor(450000, "PERCENT", 30)).toBe(135000);
    expect(depositFor(455000, "PERCENT", 30)).toBe(137000);
  });
});

describe("schedule", () => {
  const links = [
    { parentId: "S7A", childId: "S5-1" },
    { parentId: "S7A", childId: "S5-2" },
    { parentId: "S7B", childId: "S5-2" },
    { parentId: "S7B", childId: "S5-3" },
  ];
  it("sân 5 đụng với sân 7 chứa nó, không đụng sân 5 khác", () => {
    expect(conflictingPitchIds("S5-1", links).sort()).toEqual(["S5-1", "S7A"]);
  });
  it("sân 7 đụng sân con và sân 7 khác dùng chung sân con", () => {
    expect(conflictingPitchIds("S7A", links).sort()).toEqual(["S5-1", "S5-2", "S7A", "S7B"]);
  });
  it("khoảng nửa mở [start,end) — nối đuôi không trùng", () => {
    const t = (h: number) => fromVN("2026-10-13", h * 60);
    expect(overlaps(t(18), t(19), t(19), t(20))).toBe(false);
    expect(overlaps(t(18), t(19.5), t(19), t(20))).toBe(true);
  });
  it("chuyển trạng thái và hủy", () => {
    expect(canTransition("PENDING", "CONFIRMED")).toBe(true);
    expect(canTransition("COMPLETED", "CANCELLED")).toBe(false);
    const start = fromVN("2026-10-14", 18 * 60);
    expect(canCustomerCancel(start, 12, fromVN("2026-10-14", 5 * 60))).toBe(true);
    expect(canCustomerCancel(start, 12, fromVN("2026-10-14", 7 * 60))).toBe(false);
  });
});

describe("reputation", () => {
  it("chưa có đánh giá", () => expect(computeReputation([]).score).toBeNull());
  it("trừ điểm bùng kèo", () => {
    const r = computeReputation([
      { punctual: 5, fairplay: 5, levelMatch: 5, noShow: false },
      { punctual: 1, fairplay: 1, levelMatch: 1, noShow: true },
    ]);
    expect(r.score).toBe(4.5);
    expect(r.noShows).toBe(1);
  });
});

describe("vietqr", () => {
  it("crc16 CCITT-FALSE", () => expect(crc16("123456789")).toBe("29B1"));
  it("payload có số tiền, nội dung và CRC hợp lệ", () => {
    const p = buildVietQR({ bankBin: "970436", account: "0123456789", amount: 150000, note: "Cọc sân ĐS-ABC123" });
    expect(p.startsWith("000201010212")).toBe(true);
    expect(p).toContain("5406150000");
    expect(p).toContain("Coc san DS ABC123");
    expect(crc16(p.slice(0, -4))).toBe(p.slice(-4));
  });
  it("nội dung chuyển khoản ≤ 25 ký tự, không dấu", () => {
    expect(sanitizeTransferNote("Quỹ tháng 10 — Nguyễn Văn Đức dài dài")).toBe("Quy thang 10 Nguyen Van D");
  });
});

describe("text", () => {
  it("slug & SĐT", () => {
    expect(slugify("Sân bóng Đại Học Quốc Gia")).toBe("san-bong-dai-hoc-quoc-gia");
    expect(normalizePhone("+84 912 345 678")).toBe("0912345678");
  });
});

import { occupancyByHour, toCSV } from "./stats";
describe("stats", () => {
  it("tỉ lệ lấp sân theo giờ", () => {
    const rows = occupancyByHour([{ startMin: 18 * 60, endMin: 19 * 60 + 30 }], 17 * 60, 20 * 60, 2);
    expect(rows.map((r) => r.rate)).toEqual([0, 0.5, 0.25]);
  });
  it("CSV có BOM và escape", () => {
    expect(toCSV([["a,b", 'x"y']])).toBe('﻿"a,b","x""y"');
  });
});

import { containsBettingTerms } from "./moderation";
describe("moderation", () => {
  it("chặn cá cược", () => {
    for (const s of ["Kèo có độ 500k", "đá độ nước", "độ 1 củ", "Cá cược vui", "ăn tiền nhẹ", "kèo độ"]) expect(containsBettingTerms(s), s).toBe(true);
  });
  it("không chặn nhầm", () => {
    for (const s of ["Trình độ trung bình, đá vui", "Chia đôi tiền sân", "độ tuổi 25-35", "Cần 2 người đá cánh"]) expect(containsBettingTerms(s), s).toBe(false);
  });
});

import { isPendingExpired, isReminderDue } from "./schedule";
describe("nhắc giờ & tự hủy đơn chờ", () => {
  const start = fromVN("2026-10-14", 19 * 60);
  it("nhắc trong vòng 2 giờ trước giờ đá", () => {
    expect(isReminderDue(start, fromVN("2026-10-14", 16 * 60 + 59))).toBe(false);
    expect(isReminderDue(start, fromVN("2026-10-14", 17 * 60))).toBe(true);
    expect(isReminderDue(start, fromVN("2026-10-14", 19 * 60))).toBe(false);
  });
  it("đơn chờ quá hạn hoặc đã tới giờ đá", () => {
    const created = fromVN("2026-10-14", 8 * 60);
    expect(isPendingExpired(created, start, fromVN("2026-10-14", 9 * 60 + 59), 120)).toBe(false);
    expect(isPendingExpired(created, start, fromVN("2026-10-14", 10 * 60), 120)).toBe(true);
    expect(isPendingExpired(created, start, fromVN("2026-10-14", 18 * 60), 0)).toBe(false);
    expect(isPendingExpired(created, start, fromVN("2026-10-14", 19 * 60), 0)).toBe(true);
  });
});

import { pageFrom, totalPages } from "./pagination";
describe("pagination", () => {
  it("đọc trang an toàn", () => {
    expect(pageFrom(undefined)).toEqual({ page: 1, skip: 0, take: 20 });
    expect(pageFrom("3")).toEqual({ page: 3, skip: 40, take: 20 });
    for (const bad of ["0", "-2", "abc", "1.5"]) expect(pageFrom(bad).page).toBe(1);
  });
  it("số trang", () => {
    expect(totalPages(0)).toBe(1);
    expect(totalPages(41)).toBe(3);
  });
});
