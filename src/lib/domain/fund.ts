import { roundUpThousand } from "./money";
import type { FundKind } from "./constants";

export interface FundTx {
  kind: FundKind | string;
  amount: number;
  memberId: string | null;
  category?: string;
  date: Date;
}

/** Chia đều tiền trận, làm tròn LÊN 1.000đ để thủ quỹ không bị lỗ. */
export function splitEvenly(total: number, people: number): number {
  if (people <= 0) return 0;
  return roundUpThousand(total / people);
}

export interface MemberBalance {
  charged: number;
  paid: number;
  /** > 0: còn nợ; < 0: đóng dư */
  debt: number;
}

export interface FundSummary {
  balance: number;
  totalIn: number;
  totalOut: number;
  totalDebt: number;
  members: Record<string, MemberBalance>;
}

export function summarizeFund(txs: FundTx[]): FundSummary {
  const members: Record<string, MemberBalance> = {};
  let totalIn = 0;
  let totalOut = 0;
  const m = (id: string) => (members[id] ??= { charged: 0, paid: 0, debt: 0 });
  for (const t of txs) {
    if (t.kind === "PAYMENT" || t.kind === "INCOME") totalIn += t.amount;
    if (t.kind === "EXPENSE") totalOut += t.amount;
    if (t.memberId && t.kind === "CHARGE") m(t.memberId).charged += t.amount;
    if (t.memberId && t.kind === "PAYMENT") m(t.memberId).paid += t.amount;
  }
  let totalDebt = 0;
  for (const b of Object.values(members)) {
    b.debt = b.charged - b.paid;
    if (b.debt > 0) totalDebt += b.debt;
  }
  return { balance: totalIn - totalOut, totalIn, totalOut, totalDebt, members };
}

export interface MonthRow {
  month: string; // YYYY-MM
  income: number;
  expense: number;
}

export function monthlyCashflow(txs: FundTx[], monthKey: (d: Date) => string): MonthRow[] {
  const rows: Record<string, MonthRow> = {};
  for (const t of txs) {
    if (t.kind === "CHARGE") continue;
    const k = monthKey(t.date);
    const row = (rows[k] ??= { month: k, income: 0, expense: 0 });
    if (t.kind === "EXPENSE") row.expense += t.amount;
    else row.income += t.amount;
  }
  return Object.values(rows).sort((a, b) => a.month.localeCompare(b.month));
}

export function expenseByCategory(txs: FundTx[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const t of txs) if (t.kind === "EXPENSE") out[t.category ?? "OTHER"] = (out[t.category ?? "OTHER"] ?? 0) + t.amount;
  return out;
}

export function reminderMessage(p: {
  teamName: string;
  memberName: string;
  debt: number;
  formatted: string;
  bankLine?: string;
}): string {
  const lines = [
    `[${p.teamName}] Chào ${p.memberName}, bạn còn ${p.formatted} chưa đóng quỹ đội.`,
    p.bankLine ? `Chuyển khoản: ${p.bankLine}` : "",
    "Cảm ơn bạn! — gửi từ ChọnSân",
  ];
  return lines.filter(Boolean).join("\n");
}
