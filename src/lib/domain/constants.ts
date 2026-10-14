// Giá trị hợp lệ cho các trường "enum" (lưu dạng String trong DB) + nhãn tiếng Việt.

export const BOOKING_STATUS = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  COMPLETED: "Đã đá xong",
  CANCELLED: "Đã hủy",
  NO_SHOW: "Bùng (không đến)",
  BLOCKED: "Khóa giờ",
} as const;
export type BookingStatus = keyof typeof BOOKING_STATUS;

/** Các trạng thái chiếm chỗ trên lịch */
export const OCCUPYING_STATUSES: BookingStatus[] = ["PENDING", "CONFIRMED", "COMPLETED", "NO_SHOW", "BLOCKED"];

export const PITCH_SIZES = { "5": "Sân 5", "7": "Sân 7", "11": "Sân 11" } as const;
export type PitchSize = keyof typeof PITCH_SIZES;

export const SURFACES = {
  ARTIFICIAL: "Cỏ nhân tạo",
  NATURAL: "Cỏ tự nhiên",
  FUTSAL: "Sàn futsal",
} as const;

export const AMENITIES = {
  PARKING: "Gửi xe",
  WATER: "Nước uống",
  BIB: "Áo bib",
  LIGHTS: "Đèn đêm",
  CHANGING_ROOM: "Phòng thay đồ",
  CANTEEN: "Căng tin",
  WIFI: "Wifi",
  SHOWER: "Nhà tắm",
} as const;
export type Amenity = keyof typeof AMENITIES;

export const LEVELS = {
  YEU: "Mới chơi",
  TRUNG_BINH: "Trung bình",
  KHA: "Khá",
  MANH: "Mạnh",
} as const;
export type Level = keyof typeof LEVELS;

export const DEPOSIT_TYPES = { NONE: "Không cần cọc", FIXED: "Cọc cố định", PERCENT: "Cọc theo %" } as const;
export type DepositType = keyof typeof DEPOSIT_TYPES;

export const TEAM_ROLES = { CAPTAIN: "Đội trưởng", TREASURER: "Thủ quỹ", MEMBER: "Thành viên" } as const;
export type TeamRole = keyof typeof TEAM_ROLES;

export const RSVP = { YES: "Có đi", NO: "Không đi", MAYBE: "Chưa chắc" } as const;
export type Rsvp = keyof typeof RSVP;

export const FUND_KINDS = {
  CHARGE: "Khoản phải đóng",
  PAYMENT: "Thành viên đóng tiền",
  INCOME: "Thu khác",
  EXPENSE: "Chi",
} as const;
export type FundKind = keyof typeof FUND_KINDS;

export const CHARGE_CATEGORIES = { MONTHLY: "Quỹ tháng", MATCH: "Tiền trận", OTHER: "Khác" } as const;
export const EXPENSE_CATEGORIES = {
  PITCH: "Tiền sân",
  WATER: "Nước",
  KIT: "Áo đấu",
  BALL: "Bóng, dụng cụ",
  PARTY: "Liên hoan",
  OTHER: "Khác",
} as const;
export const INCOME_CATEGORIES = { SPONSOR: "Tài trợ", DONATION: "Ủng hộ", OTHER: "Khác" } as const;

export const COST_SPLIT = {
  HALF: "Chia đôi tiền sân",
  HOST: "Đội đăng trả sân",
  GUEST: "Đội nhận kèo trả sân",
} as const;
export type CostSplit = keyof typeof COST_SPLIT;

export const REPORT_REASONS = {
  BETTING: "Cá cược / kèo có độ",
  CHEATING: "Chơi xấu, bạo lực",
  FRAUD: "Lừa đảo",
  NO_SHOW: "Bùng kèo",
  OTHER: "Khác",
} as const;
export type ReportReason = keyof typeof REPORT_REASONS;

export const SPORTS = { FOOTBALL: "Bóng đá" } as const;

export const PLAN_LIMITS = {
  FREE: { venues: 1, pitches: 2 },
  PRO: { venues: Infinity, pitches: Infinity },
} as const;

export function label<T extends Record<string, string>>(map: T, key: string | null | undefined): string {
  if (!key) return "";
  return (map as Record<string, string>)[key] ?? key;
}

export function isKey<T extends Record<string, unknown>>(map: T, key: unknown): key is keyof T {
  return typeof key === "string" && Object.prototype.hasOwnProperty.call(map, key);
}
