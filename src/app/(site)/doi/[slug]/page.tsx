import Link from "next/link";
import { db } from "@/lib/server/db";
import { loadTeamContext } from "@/lib/server/team";
import { TEAM_ROLES, label } from "@/lib/domain/constants";
import { formatDateTime } from "@/lib/domain/time";
import { Flash } from "@/components/flash";
import { Badge } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { leaveTeamAction } from "../actions";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const team = await db.team.findUnique({ where: { slug: (await params).slug } });
  return team ? { title: `${team.name} – đội bóng ${team.district}` } : {};
}

export default async function TeamOverview({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const { team, me } = await loadTeamContext(slug);
  const [members, results, upcoming, ratings] = await Promise.all([
    db.teamMember.findMany({ where: { teamId: team.id, active: true }, orderBy: [{ role: "asc" }, { displayName: "asc" }] }),
    db.teamEvent.findMany({ where: { teamId: team.id, finished: true, scoreFor: { not: null } }, orderBy: { start: "desc" }, take: 5 }),
    me ? db.teamEvent.findMany({ where: { teamId: team.id, finished: false, start: { gt: new Date(Date.now() - 3 * 3600_000) } }, include: { attendances: true }, orderBy: { start: "asc" }, take: 3 }) : [],
    db.teamRating.findMany({ where: { toTeamId: team.id }, include: { fromTeam: true }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);
  const myAtt = (e: (typeof upcoming)[number]) => e.attendances.find((a) => a.memberId === me?.id)?.response;
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        <Flash searchParams={sp} />
        {me && upcoming.length > 0 && (
          <section className="card border-brand-200">
            <h2 className="h2 mb-2">Sắp đá</h2>
            <ul className="divide-y divide-gray-100">
              {upcoming.map((e) => (
                <li key={e.id} className="flex items-center justify-between py-2 text-sm">
                  <span><strong>{e.title}</strong> · {formatDateTime(e.start)} · {e.venueText} <span className="text-gray-500">({e.attendances.filter((a) => a.response === "YES").length} người đi)</span></span>
                  <Link href={`/doi/${slug}/lich`} className={myAtt(e) ? "btn-secondary btn-sm" : "btn-primary btn-sm"}>{myAtt(e) ? "Đổi điểm danh" : "Điểm danh"}</Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        <section className="card">
          <h2 className="h2 mb-2">Giới thiệu</h2>
          <p className="text-sm text-gray-700">{team.description || "Chưa có giới thiệu."}</p>
          {team.homeVenue && <p className="mt-2 text-sm"><span className="text-gray-500">Sân nhà:</span> {team.homeVenue}</p>}
          {!me && <p className="mt-3 text-sm text-gray-500">Muốn vào đội? Nhờ đội trưởng gửi link mời. Muốn đá giao hữu? <Link href="/keo" className="text-brand-700">Xem kèo</Link>.</p>}
        </section>
        <section className="card">
          <h2 className="h2 mb-2">Kết quả gần đây</h2>
          {results.length === 0 ? <p className="muted">Chưa có.</p> : (
            <ul className="divide-y divide-gray-100 text-sm">
              {results.map((e) => {
                const r = e.scoreFor! > e.scoreAgainst! ? ["Thắng", "green"] : e.scoreFor === e.scoreAgainst ? ["Hòa", "gray"] : ["Thua", "red"];
                return <li key={e.id} className="flex justify-between py-2"><span>{formatDateTime(e.start)} · vs {e.opponent || "đá nội bộ"}</span><span><strong>{e.scoreFor}–{e.scoreAgainst}</strong> <Badge tone={r[1] as "green"}>{r[0]}</Badge></span></li>;
              })}
            </ul>
          )}
        </section>
        <section className="card">
          <h2 className="h2 mb-2">Đội bạn nhận xét</h2>
          {ratings.length === 0 ? <p className="muted">Chưa có đánh giá.</p> : (
            <ul className="divide-y divide-gray-100 text-sm">
              {ratings.map((r) => <li key={r.id} className="py-2"><strong>{r.fromTeam.name}</strong>{r.noShow ? <Badge tone="red">Báo bùng kèo</Badge> : <span className="ml-2 text-gray-500">Đúng giờ {r.punctual}★ · Fair-play {r.fairplay}★ · Đúng trình {r.levelMatch}★</span>}{r.comment && <p className="text-gray-700">{r.comment}</p>}</li>)}
            </ul>
          )}
        </section>
      </div>
      <aside className="space-y-5">
        <section className="card">
          <h2 className="h2 mb-2">Thành viên ({members.length})</h2>
          <ul className="space-y-1.5 text-sm">
            {members.map((m) => (
              <li key={m.id} className="flex items-center justify-between">
                <span>{m.jerseyNo != null && <span className="mr-1 inline-block w-6 text-gray-400">#{m.jerseyNo}</span>}{m.displayName}{!m.userId && <span className="text-xs text-gray-400"> (chưa có TK)</span>}</span>
                {m.role !== "MEMBER" && <Badge tone="green">{label(TEAM_ROLES, m.role)}</Badge>}
              </li>
            ))}
          </ul>
        </section>
        {me && <form action={leaveTeamAction.bind(null, team.id)}><SubmitButton className="btn-ghost btn-sm text-red-600" confirm={`Rời đội ${team.name}?`}>Rời đội</SubmitButton></form>}
      </aside>
    </div>
  );
}
