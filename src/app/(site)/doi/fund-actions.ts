"use server";
import { db } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { audit, requireTeamRole } from "@/lib/server/team";
import { done, fail, int, str } from "@/lib/server/flash";
import { notify } from "@/lib/server/notify";
import { CHARGE_CATEGORIES, EXPENSE_CATEGORIES, FUND_KINDS, INCOME_CATEGORIES, isKey, label } from "@/lib/domain/constants";
import { summarizeFund } from "@/lib/domain/fund";
import { formatVND } from "@/lib/domain/money";
import { formatMonthKey, fromVN, isDateKey, todayKey, vnMonthKey } from "@/lib/domain/time";

async function ctx(teamId: string) {
  const user = await requireUser("/doi");
  const team = await db.team.findUniqueOrThrow({ where: { id: teamId } });
  const back = `/doi/${team.slug}/quy`;
  const me = await requireTeamRole(teamId, user.id, "fund", back);
  return { user, team, back, me };
}

export async function addTransactionAction(teamId: string, form: FormData) {
  const { user, back } = await ctx(teamId);
  const kind = str(form, "kind");
  const amount = int(form, "amount");
  const memberId = str(form, "memberId") || null;
  const category = str(form, "category") || "OTHER";
  const date = str(form, "date");
  if (!isKey(FUND_KINDS, kind)) fail(back, "Loại giao dịch không hợp lệ");
  if (amount <= 0) fail(back, "Số tiền phải lớn hơn 0");
  if ((kind === "CHARGE" || kind === "PAYMENT") && !memberId) fail(back, "Chọn thành viên");
  if (memberId && !(await db.teamMember.findFirst({ where: { id: memberId, teamId } }))) fail(back, "Thành viên không hợp lệ");
  const cats = kind === "EXPENSE" ? EXPENSE_CATEGORIES : kind === "INCOME" ? INCOME_CATEGORIES : CHARGE_CATEGORIES;
  const tx = await db.fundTransaction.create({
    data: {
      teamId, kind, amount, memberId: kind === "EXPENSE" || kind === "INCOME" ? null : memberId,
      category: isKey(cats, category) ? category : "OTHER", note: str(form, "note").slice(0, 200),
      date: isDateKey(date) ? fromVN(date, 12 * 60) : new Date(), createdById: user.id,
    },
    include: { member: true },
  });
  await audit(teamId, user.name, "Thêm", `${label(FUND_KINDS, kind)} ${formatVND(amount)}${tx.member ? ` – ${tx.member.displayName}` : ""}${tx.note ? ` (${tx.note})` : ""}`);
  done(back, `Đã ghi: ${label(FUND_KINDS, kind)} ${formatVND(amount)}`);
}

export async function deleteTransactionAction(teamId: string, txId: string) {
  const { user, back } = await ctx(teamId);
  const tx = await db.fundTransaction.findFirst({ where: { id: txId, teamId, deletedAt: null }, include: { member: true } });
  if (!tx) fail(back, "Không tìm thấy giao dịch");
  await db.fundTransaction.update({ where: { id: tx.id }, data: { deletedAt: new Date() } });
  await audit(teamId, user.name, "Xóa", `${label(FUND_KINDS, tx.kind)} ${formatVND(tx.amount)}${tx.member ? ` – ${tx.member.displayName}` : ""}`);
  done(back, "Đã xóa giao dịch (vẫn lưu trong nhật ký)");
}

/** Tạo khoản quỹ tháng cho mọi thành viên đang hoạt động (bỏ qua người đã có) */
export async function issueMonthlyAction(teamId: string) {
  const { user, team, back } = await ctx(teamId);
  if (team.monthlyFee <= 0) fail(back, "Đội chưa đặt mức quỹ tháng (vào Quản lý đội)");
  const month = vnMonthKey(new Date());
  const note = `Quỹ ${formatMonthKey(month)}`;
  const members = await db.teamMember.findMany({ where: { teamId, active: true } });
  const already = await db.fundTransaction.findMany({ where: { teamId, kind: "CHARGE", category: "MONTHLY", note, deletedAt: null } });
  const todo = members.filter((m) => !already.some((t) => t.memberId === m.id));
  if (todo.length === 0) fail(back, `Đã tạo ${note} cho tất cả thành viên`);
  await db.fundTransaction.createMany({
    data: todo.map((m) => ({ teamId, kind: "CHARGE", category: "MONTHLY", memberId: m.id, amount: team.monthlyFee, note, createdById: user.id })),
  });
  for (const m of todo) await notify(m.userId, `${team.name}: ${note} ${formatVND(team.monthlyFee)}`, "Vào quỹ đội để xem mã chuyển khoản", `/doi/${team.slug}/quy`);
  await audit(teamId, user.name, "Thu quỹ tháng", `${note}: ${todo.length} người × ${formatVND(team.monthlyFee)}`);
  done(back, `Đã tạo ${note} cho ${todo.length} thành viên`);
}

/** Ghi nhận thành viên đã đóng đủ số đang nợ */
export async function settleMemberAction(teamId: string, memberId: string) {
  const { user, back } = await ctx(teamId);
  const txs = await db.fundTransaction.findMany({ where: { teamId, memberId, deletedAt: null } });
  const debt = summarizeFund(txs).members[memberId]?.debt ?? 0;
  if (debt <= 0) fail(back, "Thành viên này không còn nợ");
  const member = await db.teamMember.findUniqueOrThrow({ where: { id: memberId } });
  await db.fundTransaction.create({ data: { teamId, kind: "PAYMENT", memberId, amount: debt, note: "Đóng đủ", createdById: user.id, date: fromVN(todayKey(), 12 * 60) } });
  await audit(teamId, user.name, "Thu", `${member.displayName} đóng đủ ${formatVND(debt)}`);
  done(back, `${member.displayName} đã đóng ${formatVND(debt)}`);
}
