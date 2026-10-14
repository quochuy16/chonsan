export const PAGE_SIZE = 20;

export interface PageInfo {
  page: number;
  skip: number;
  take: number;
}

/** Đọc ?page= an toàn (số nguyên ≥ 1) */
export function pageFrom(raw: string | undefined, size = PAGE_SIZE): PageInfo {
  const n = Number(raw);
  const page = Number.isInteger(n) && n >= 1 ? n : 1;
  return { page, skip: (page - 1) * size, take: size };
}

export function totalPages(total: number, size = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / size));
}
