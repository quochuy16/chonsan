/** Tỉ lệ lấp sân theo từng giờ trong ngày (0..1). intervals: phút trong ngày [start,end). */
export function occupancyByHour(
  intervals: { startMin: number; endMin: number }[],
  openMin: number,
  closeMin: number,
  pitchDays: number, // số sân con × số ngày
): { hour: number; rate: number }[] {
  const rows: { hour: number; rate: number }[] = [];
  if (pitchDays <= 0) return rows;
  for (let h = Math.floor(openMin / 60); h * 60 < closeMin; h++) {
    const hs = Math.max(h * 60, openMin), he = Math.min(h * 60 + 60, closeMin);
    const capacity = (he - hs) * pitchDays;
    const used = intervals.reduce((s, i) => s + Math.max(0, Math.min(i.endMin, he) - Math.max(i.startMin, hs)), 0);
    rows.push({ hour: h, rate: capacity ? Math.min(1, used / capacity) : 0 });
  }
  return rows;
}

export function csvEscape(v: unknown): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV(rows: unknown[][]): string {
  return "﻿" + rows.map((r) => r.map(csvEscape).join(",")).join("\n");
}
