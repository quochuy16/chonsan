// Giờ Việt Nam = UTC+7, không đổi giờ mùa hè. Mọi nghiệp vụ theo ngày/giờ đi qua file này.
export const VN_OFFSET_MIN = 7 * 60;
const MS_PER_MIN = 60_000;
const WEEKDAY_SHORT = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const WEEKDAY_LONG = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

export interface VNParts {
  year: number;
  month: number; // 1..12
  day: number;
  dow: number; // 0 = Chủ nhật
  minutes: number; // phút trong ngày
}

export function vnParts(date: Date): VNParts {
  const shifted = new Date(date.getTime() + VN_OFFSET_MIN * MS_PER_MIN);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    dow: shifted.getUTCDay(),
    minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "YYYY-MM-DD" theo giờ VN */
export function vnDateKey(date: Date): string {
  const p = vnParts(date);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

export function todayKey(now: Date = new Date()): string {
  return vnDateKey(now);
}

export function isDateKey(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/** Tạo Date (UTC) từ ngày VN + phút trong ngày (cho phép 1440 = 24:00) */
export function fromVN(dateKey: string, minutes: number): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, minutes) - VN_OFFSET_MIN * MS_PER_MIN);
}

export function addDays(dateKey: string, n: number): string {
  return vnDateKey(new Date(fromVN(dateKey, 0).getTime() + n * 86_400_000));
}

export function dowOfKey(dateKey: string): number {
  return vnParts(fromVN(dateKey, 0)).dow;
}

export function minutesToHHMM(min: number): string {
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
}

export function hhmmToMinutes(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function formatTime(date: Date): string {
  return minutesToHHMM(vnParts(date).minutes);
}

/** "T3, 14/10" */
export function formatDateShort(date: Date | string): string {
  const d = typeof date === "string" ? fromVN(date, 0) : date;
  const p = vnParts(d);
  return `${WEEKDAY_SHORT[p.dow]}, ${pad(p.day)}/${pad(p.month)}`;
}

/** "Thứ 3, 14/10/2026" */
export function formatDateLong(date: Date | string): string {
  const d = typeof date === "string" ? fromVN(date, 0) : date;
  const p = vnParts(d);
  return `${WEEKDAY_LONG[p.dow]}, ${pad(p.day)}/${pad(p.month)}/${p.year}`;
}

export function formatDateTime(date: Date): string {
  return `${formatTime(date)} ${formatDateShort(date)}`;
}

export function weekdayShort(dow: number): string {
  return WEEKDAY_SHORT[dow];
}

/** "YYYY-MM" theo giờ VN */
export function vnMonthKey(date: Date): string {
  const p = vnParts(date);
  return `${p.year}-${pad(p.month)}`;
}

export function formatMonthKey(key: string): string {
  const [y, m] = key.split("-");
  return `T${Number(m)}/${y}`;
}
