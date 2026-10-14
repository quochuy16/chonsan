import { OCCUPYING_STATUSES, type BookingStatus } from "./constants";

export interface PitchLinkInput {
  parentId: string;
  childId: string;
}

export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Các sân con "đụng nhau" với pitchId: chính nó, sân cha chứa nó, sân con của nó,
 * và các sân cha khác dùng chung sân con với nó (vd hai sân 7 cùng ghép từ một sân 5).
 */
export function conflictingPitchIds(pitchId: string, links: PitchLinkInput[]): string[] {
  const result = new Set<string>([pitchId]);
  const parentsOf = (id: string) => links.filter((l) => l.childId === id).map((l) => l.parentId);
  const childrenOf = (id: string) => links.filter((l) => l.parentId === id).map((l) => l.childId);
  for (const p of parentsOf(pitchId)) result.add(p);
  for (const c of childrenOf(pitchId)) {
    result.add(c);
    for (const p of parentsOf(c)) result.add(p);
  }
  return [...result];
}

export function isOccupying(status: string): boolean {
  return OCCUPYING_STATUSES.includes(status as BookingStatus);
}

const TRANSITIONS: Record<string, BookingStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["COMPLETED", "CANCELLED", "NO_SHOW"],
  BLOCKED: ["CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

export function canTransition(from: string, to: BookingStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

/** Người đặt được tự hủy khi còn >= cancelHours giờ trước giờ đá */
export function canCustomerCancel(start: Date, cancelHours: number, now: Date = new Date()): boolean {
  return start.getTime() - now.getTime() >= cancelHours * 3_600_000;
}

/** Các ngày (dateKey) của một lịch cố định hằng tuần */
export function weeklyDates(firstDateKey: string, weeks: number, addDays: (k: string, n: number) => string): string[] {
  return Array.from({ length: weeks }, (_, i) => addDays(firstDateKey, i * 7));
}

export const REMINDER_LEAD_MIN = 120;

/** Đến lúc gửi nhắc giờ đá: còn ≤ leadMin phút và chưa tới giờ đá */
export function isReminderDue(start: Date, now: Date, leadMin = REMINDER_LEAD_MIN): boolean {
  const diff = start.getTime() - now.getTime();
  return diff > 0 && diff <= leadMin * 60_000;
}

/**
 * Đơn chờ xác nhận hết hạn khi: đã chờ ≥ expireMin phút, hoặc đã tới giờ đá mà chủ sân vẫn chưa xác nhận.
 * expireMin = 0: không tự hủy theo thời gian chờ (nhưng vẫn hủy khi đã tới giờ đá).
 */
export function isPendingExpired(createdAt: Date, start: Date, now: Date, expireMin: number): boolean {
  if (start.getTime() <= now.getTime()) return true;
  return expireMin > 0 && now.getTime() - createdAt.getTime() >= expireMin * 60_000;
}
