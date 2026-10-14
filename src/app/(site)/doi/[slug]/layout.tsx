import { loadTeamContext } from "@/lib/server/team";
import { db } from "@/lib/server/db";
import { LEVELS, label } from "@/lib/domain/constants";
import { computeReputation } from "@/lib/domain/reputation";
import { Badge, Stars } from "@/components/ui";
import { TeamTabs } from "./team-tabs";

export default async function TeamLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { team, me, isCaptain } = await loadTeamContext(slug);
  const rep = computeReputation(await db.teamRating.findMany({ where: { toTeamId: team.id } }));
  return (
    <div className="container-page py-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand-600 text-xl font-bold text-white">{team.name.slice(0, 2).toUpperCase()}</span>
        <div className="min-w-0">
          <h1 className="h1 truncate">{team.name}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
            <span>{team.district}, {team.province}</span><Badge>{label(LEVELS, team.level)}</Badge>
            <span title="Điểm uy tín từ các đội đã đá cùng">Uy tín: <Stars value={rep.score} count={rep.count} /></span>
            {rep.noShows > 0 && <Badge tone="red">{rep.noShows} lần bùng kèo</Badge>}
          </div>
        </div>
      </div>
      <TeamTabs slug={slug} isMember={!!me} isCaptain={isCaptain} />
      {children}
    </div>
  );
}
