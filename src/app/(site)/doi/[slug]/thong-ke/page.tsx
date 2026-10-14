import { db } from "@/lib/server/db";
import { loadTeamContext } from "@/lib/server/team";
import { EXPENSE_CATEGORIES, label } from "@/lib/domain/constants";
import { expenseByCategory, monthlyCashflow } from "@/lib/domain/fund";
import { formatVND, formatVNDShort } from "@/lib/domain/money";
import { formatMonthKey, vnMonthKey } from "@/lib/domain/time";
import { BarList, StatCard } from "@/components/ui";

export const metadata = { title: "Thống kê đội" };

export default async function TeamStats({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { team } = await loadTeamContext(slug, { memberOnly: true });
  const [txs, events, members] = await Promise.all([
    db.fundTransaction.findMany({ where: { teamId: team.id, deletedAt: null } }),
    db.teamEvent.findMany({ where: { teamId: team.id, finished: true }, include: { attendances: true } }),
    db.teamMember.findMany({ where: { teamId: team.id, active: true } }),
  ]);
  const flows = monthlyCashflow(txs, vnMonthKey).slice(-6);
  const byCat = expenseByCategory(txs);
  const matches = events.filter((e) => e.scoreFor != null && e.scoreAgainst != null);
  const w = matches.filter((e) => e.scoreFor! > e.scoreAgainst!).length;
  const d = matches.filter((e) => e.scoreFor === e.scoreAgainst).length;
  const gf = matches.reduce((s, e) => s + e.scoreFor!, 0), ga = matches.reduce((s, e) => s + e.scoreAgainst!, 0);
  const players = members.map((m) => {
    const att = events.flatMap((e) => e.attendances).filter((a) => a.memberId === m.id);
    return { name: m.displayName, played: att.filter((a) => a.attended).length, goals: att.reduce((s, a) => s + a.goals, 0), assists: att.reduce((s, a) => s + a.assists, 0) };
  }).sort((a, b) => b.played - a.played || b.goals - a.goals);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Số buổi đá" value={events.length} />
        <StatCard label="Thắng / Hòa / Thua" value={`${w} / ${d} / ${matches.length - w - d}`} />
        <StatCard label="Bàn thắng / thua" value={`${gf} / ${ga}`} />
        <StatCard label="Thành viên" value={members.length} />
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="card">
          <h2 className="h2 mb-3">Thu chi 6 tháng gần nhất</h2>
          {flows.length === 0 ? <p className="muted">Chưa có dữ liệu.</p> : (
            <ul className="space-y-3 text-sm">
              {flows.map((f) => {
                const max = Math.max(1, ...flows.flatMap((x) => [x.income, x.expense]));
                return (
                  <li key={f.month}>
                    <p className="mb-1 font-medium">{formatMonthKey(f.month)} <span className="text-gray-400">· chênh lệch {formatVND(f.income - f.expense)}</span></p>
                    <div className="flex items-center gap-2"><span className="w-8 text-xs text-gray-500">Thu</span><div className="h-2 rounded-full bg-brand-500" style={{ width: `${(f.income / max) * 80}%` }} /><span className="text-xs">{formatVNDShort(f.income)}</span></div>
                    <div className="flex items-center gap-2"><span className="w-8 text-xs text-gray-500">Chi</span><div className="h-2 rounded-full bg-red-400" style={{ width: `${(f.expense / max) * 80}%` }} /><span className="text-xs">{formatVNDShort(f.expense)}</span></div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <section className="card">
          <h2 className="h2 mb-3">Cơ cấu chi</h2>
          <BarList rows={Object.entries(byCat).map(([k, v]) => ({ label: label(EXPENSE_CATEGORIES, k), value: v })).sort((a, b) => b.value - a.value)} format={formatVND} />
        </section>
      </div>
      <section className="card">
        <h2 className="h2 mb-3">Cầu thủ</h2>
        <div className="overflow-x-auto"><table className="table">
          <thead><tr><th>Thành viên</th><th className="text-right">Có mặt</th><th className="text-right">Chuyên cần</th><th className="text-right">Bàn</th><th className="text-right">Kiến tạo</th></tr></thead>
          <tbody>{players.map((p) => (
            <tr key={p.name}><td>{p.name}</td><td className="text-right">{p.played}</td><td className="text-right">{events.length ? Math.round((p.played / events.length) * 100) : 0}%</td><td className="text-right">{p.goals}</td><td className="text-right">{p.assists}</td></tr>
          ))}</tbody>
        </table></div>
      </section>
    </div>
  );
}
