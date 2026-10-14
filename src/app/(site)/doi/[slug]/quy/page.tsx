import { db } from "@/lib/server/db";
import { loadTeamContext } from "@/lib/server/team";
import { CHARGE_CATEGORIES, EXPENSE_CATEGORIES, FUND_KINDS, INCOME_CATEGORIES, label } from "@/lib/domain/constants";
import { reminderMessage, summarizeFund } from "@/lib/domain/fund";
import { formatVND } from "@/lib/domain/money";
import { BANKS } from "@/lib/domain/vietqr";
import { formatDateShort, formatDateTime, formatMonthKey, todayKey, vnMonthKey } from "@/lib/domain/time";
import { CopyButton } from "@/components/copy-button";
import { Flash } from "@/components/flash";
import { StatCard } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { VietQR } from "@/components/vietqr";
import { addTransactionAction, deleteTransactionAction, issueMonthlyAction, settleMemberAction } from "../../fund-actions";
import { FundEntryForm } from "./fund-entry-form";

export const metadata = { title: "Quỹ đội" };

const KIND_STYLE: Record<string, string> = { PAYMENT: "text-brand-700", INCOME: "text-brand-700", EXPENSE: "text-red-600", CHARGE: "text-gray-500" };

export default async function FundPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const { team, me, canFund } = await loadTeamContext(slug, { memberOnly: true });
  const [members, txs, logs] = await Promise.all([
    db.teamMember.findMany({ where: { teamId: team.id }, orderBy: { displayName: "asc" } }),
    db.fundTransaction.findMany({ where: { teamId: team.id, deletedAt: null }, include: { member: true }, orderBy: [{ date: "desc" }, { createdAt: "desc" }] }),
    db.fundAuditLog.findMany({ where: { teamId: team.id }, orderBy: { createdAt: "desc" }, take: 30 }),
  ]);
  const sum = summarizeFund(txs);
  const rows = members
    .map((m) => ({ m, b: sum.members[m.id] ?? { charged: 0, paid: 0, debt: 0 } }))
    .filter((r) => r.m.active || r.b.debt !== 0)
    .sort((a, b) => b.b.debt - a.b.debt);
  const myDebt = me ? sum.members[me.id]?.debt ?? 0 : 0;
  const bankLine = team.bankBin && team.bankAccount ? `${BANKS[team.bankBin]} ${team.bankAccount}${team.bankAccountName ? ` (${team.bankAccountName})` : ""}` : undefined;
  const month = formatMonthKey(vnMonthKey(new Date()));

  return (
    <div className="space-y-5">
      <Flash searchParams={sp} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Số dư quỹ" value={<span className={sum.balance < 0 ? "text-red-600" : "text-brand-700"}>{formatVND(sum.balance)}</span>} />
        <StatCard label="Tổng thu" value={formatVND(sum.totalIn)} />
        <StatCard label="Tổng chi" value={formatVND(sum.totalOut)} />
        <StatCard label="Thành viên còn nợ" value={formatVND(sum.totalDebt)} hint={`${rows.filter((r) => r.b.debt > 0).length} người`} />
      </div>

      {me && myDebt > 0 && (
        <section className="card border-amber-300 bg-amber-50">
          <h2 className="h2 mb-2">Bạn còn nợ quỹ {formatVND(myDebt)}</h2>
          <VietQR bankBin={team.bankBin} account={team.bankAccount} accountName={team.bankAccountName} amount={myDebt} note={`${me.displayName} quy ${team.name}`} />
          <p className="mt-2 text-xs text-gray-600">Chuyển xong, thủ quỹ sẽ ghi nhận cho bạn.</p>
        </section>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <section className="card lg:col-span-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="h2">Công nợ thành viên</h2>
            {canFund && team.monthlyFee > 0 && <form action={issueMonthlyAction.bind(null, team.id)}><SubmitButton className="btn-secondary btn-sm" confirm={`Tạo khoản quỹ ${month} (${formatVND(team.monthlyFee)}/người)?`}>+ Thu quỹ {month}</SubmitButton></form>}
          </div>
          <div className="overflow-x-auto"><table className="table">
            <thead><tr><th>Thành viên</th><th className="text-right">Phải đóng</th><th className="text-right">Đã đóng</th><th className="text-right">Còn nợ</th>{canFund && <th />}</tr></thead>
            <tbody>
              {rows.map(({ m, b }) => (
                <tr key={m.id}>
                  <td>{m.displayName}{!m.active && <span className="text-xs text-gray-400"> (đã rời)</span>}</td>
                  <td className="text-right tabular-nums">{formatVND(b.charged)}</td>
                  <td className="text-right tabular-nums">{formatVND(b.paid)}</td>
                  <td className={`text-right font-semibold tabular-nums ${b.debt > 0 ? "text-red-600" : b.debt < 0 ? "text-brand-700" : "text-gray-400"}`}>{b.debt < 0 ? `dư ${formatVND(-b.debt)}` : formatVND(b.debt)}</td>
                  {canFund && (
                    <td className="whitespace-nowrap text-right">
                      {b.debt > 0 && <>
                        <form action={settleMemberAction.bind(null, team.id, m.id)} className="inline"><SubmitButton className="btn-primary btn-sm" confirm={`${m.displayName} đã đóng ${formatVND(b.debt)}?`}>Đã đóng đủ</SubmitButton></form>{" "}
                        <CopyButton label="Nhắc" text={reminderMessage({ teamName: team.name, memberName: m.displayName, debt: b.debt, formatted: formatVND(b.debt), bankLine })} />
                      </>}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table></div>
          {canFund && <p className="mt-2 text-xs text-gray-500">&quot;Nhắc&quot; chép sẵn tin nhắn để bạn dán vào Zalo/Messenger.</p>}
        </section>

        <aside className="space-y-5 lg:col-span-2">
          {canFund ? (
            <section className="card">
              <h2 className="h2 mb-3">Ghi thu / chi</h2>
              <FundEntryForm action={addTransactionAction.bind(null, team.id)} today={todayKey()}
                members={members.filter((m) => m.active).map((m) => ({ id: m.id, name: m.displayName }))}
                kinds={FUND_KINDS} categories={{ CHARGE: CHARGE_CATEGORIES, PAYMENT: {}, INCOME: INCOME_CATEGORIES, EXPENSE: EXPENSE_CATEGORIES }} />
            </section>
          ) : (
            <section className="card"><h2 className="h2 mb-2">Chuyển khoản quỹ</h2>
              <VietQR bankBin={team.bankBin} account={team.bankAccount} accountName={team.bankAccountName} note={`${me?.displayName ?? ""} quy ${team.name}`} /></section>
          )}
        </aside>
      </div>

      <section className="card">
        <h2 className="h2 mb-2">Sổ quỹ</h2>
        <div className="overflow-x-auto"><table className="table">
          <thead><tr><th>Ngày</th><th>Loại</th><th>Nội dung</th><th className="text-right">Số tiền</th>{canFund && <th />}</tr></thead>
          <tbody>
            {txs.slice(0, 100).map((t) => {
              const cats = t.kind === "EXPENSE" ? EXPENSE_CATEGORIES : t.kind === "INCOME" ? INCOME_CATEGORIES : CHARGE_CATEGORIES;
              return (
                <tr key={t.id}>
                  <td className="whitespace-nowrap">{formatDateShort(t.date)}</td>
                  <td className="whitespace-nowrap">{label(FUND_KINDS, t.kind)}{t.kind !== "PAYMENT" && <span className="text-gray-400"> · {label(cats, t.category)}</span>}</td>
                  <td>{t.member?.displayName}{t.member && t.note ? " – " : ""}{t.note}</td>
                  <td className={`text-right font-semibold tabular-nums ${KIND_STYLE[t.kind]}`}>{t.kind === "EXPENSE" ? "-" : t.kind === "CHARGE" ? "" : "+"}{formatVND(t.amount)}</td>
                  {canFund && <td className="text-right"><form action={deleteTransactionAction.bind(null, team.id, t.id)}><SubmitButton className="btn-ghost btn-sm" confirm="Xóa giao dịch này?">Xóa</SubmitButton></form></td>}
                </tr>
              );
            })}
          </tbody>
        </table></div>
        <p className="mt-2 text-xs text-gray-500">&quot;Khoản phải đóng&quot; không làm thay đổi số dư — chỉ ghi ai cần đóng bao nhiêu. Số dư = tiền thành viên đã đóng + thu khác − chi.</p>
      </section>

      <details className="card">
        <summary className="cursor-pointer font-semibold">Nhật ký sửa đổi ({logs.length})</summary>
        <ul className="mt-3 space-y-1 text-sm">
          {logs.map((l) => <li key={l.id}><span className="text-gray-400">{formatDateTime(l.createdAt)}</span> · <strong>{l.actorName}</strong> {l.action.toLowerCase()}: {l.detail}</li>)}
        </ul>
      </details>
    </div>
  );
}
