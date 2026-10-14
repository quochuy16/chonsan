import { roundThousand, roundUpThousand } from "./money";
import type { DepositType } from "./constants";

export const PRICE_STEP_MIN = 30;

export interface PriceRuleInput {
  pitchId: string | null; // null = áp dụng cho mọi sân con của cụm
  daysOfWeek: number[];
  startMin: number;
  endMin: number;
  pricePerHour: number;
}

export interface DealInput {
  startMin: number; // trong ngày đang tính
  endMin: number;
  percent: number;
}

export function parseDays(csv: string): number[] {
  return csv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number)
    .filter((n) => n >= 0 && n <= 6);
}

/** Giá/giờ áp dụng tại một phút trong ngày. Rule gắn sân con cụ thể thắng rule chung. */
export function hourlyPriceAt(rules: PriceRuleInput[], pitchId: string, dow: number, minute: number): number | null {
  const match = (r: PriceRuleInput) => r.daysOfWeek.includes(dow) && r.startMin <= minute && minute < r.endMin;
  const specific = rules.find((r) => r.pitchId === pitchId && match(r));
  if (specific) return specific.pricePerHour;
  const general = rules.find((r) => r.pitchId === null && match(r));
  return general ? general.pricePerHour : null;
}

export interface Quote {
  ok: boolean;
  total: number;
  /** tổng trước giảm giá / ngày lễ */
  base: number;
  discount: number;
  holidayPercent: number;
  unpricedAt?: number; // phút không có giá
}

/**
 * Báo giá cho một đơn trong MỘT ngày (giờ VN). startMin/endMin là phút trong ngày, bội số 30.
 * Mỗi bước 30 phút lấy giá của rule khớp; giảm giá giờ trống trừ trên bước giao nhau; ngày lễ nhân %.
 */
export function quote(params: {
  rules: PriceRuleInput[];
  pitchId: string;
  dow: number;
  startMin: number;
  endMin: number;
  holidayPercent?: number;
  deals?: DealInput[];
}): Quote {
  const { rules, pitchId, dow, startMin, endMin, deals = [] } = params;
  const holidayPercent = params.holidayPercent ?? 100;
  let base = 0;
  let discounted = 0;
  for (let m = startMin; m < endMin; m += PRICE_STEP_MIN) {
    const hourly = hourlyPriceAt(rules, pitchId, dow, m);
    if (hourly === null) return { ok: false, total: 0, base: 0, discount: 0, holidayPercent, unpricedAt: m };
    const step = (hourly * PRICE_STEP_MIN) / 60;
    const deal = deals.find((d) => d.startMin <= m && m < d.endMin);
    base += step;
    discounted += deal ? (step * (100 - deal.percent)) / 100 : step;
  }
  const total = roundThousand((discounted * holidayPercent) / 100);
  const baseWithHoliday = roundThousand((base * holidayPercent) / 100);
  return { ok: true, total, base: baseWithHoliday, discount: baseWithHoliday - total, holidayPercent };
}

export function depositFor(total: number, type: DepositType | string, value: number): number {
  if (type === "FIXED") return Math.min(value, total);
  if (type === "PERCENT") return Math.min(total, roundUpThousand((total * value) / 100));
  return 0;
}

/** Giá thấp nhất trong bảng giá (để hiển thị "từ 300k/giờ") */
export function minHourlyPrice(rules: Pick<PriceRuleInput, "pricePerHour">[]): number | null {
  if (rules.length === 0) return null;
  return Math.min(...rules.map((r) => r.pricePerHour));
}

const DAY_SHORT = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

/** [1,2,3,4,5] -> "T2–T6"; [0,6] -> "T7, CN" */
export function formatDays(days: number[]): string {
  const order = [1, 2, 3, 4, 5, 6, 0];
  const sorted = order.filter((d) => days.includes(d));
  if (sorted.length === 7) return "Cả tuần";
  const idx = sorted.map((d) => order.indexOf(d));
  const contiguous = idx.every((v, i) => i === 0 || v === idx[i - 1] + 1);
  if (contiguous && sorted.length >= 3) return `${DAY_SHORT[sorted[0]]}–${DAY_SHORT[sorted[sorted.length - 1]]}`;
  return sorted.map((d) => DAY_SHORT[d]).join(", ");
}
