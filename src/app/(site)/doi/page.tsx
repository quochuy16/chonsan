import Link from "next/link";
import { db } from "@/lib/server/db";
import { getCurrentUser } from "@/lib/server/auth";
import { LEVELS, TEAM_ROLES, label } from "@/lib/domain/constants";
import { computeReputation } from "@/lib/domain/reputation";
import { Flash } from "@/components/flash";
import { Badge, Empty, Stars } from "@/components/ui";

export const metadata = { title: "Đội bóng" };

export default async function TeamsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; q?: string }> }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  const mine = user ? await db.teamMember.findMany({ where: { userId: user.id, active: true }, include: { team: { include: { _count: { select: { members: { where: { active: true } } } } } } } }) : [];
  const publicTeams = await db.team.findMany({
    where: { isPublic: true, ...(sp.q ? { name: { contains: sp.q } } : {}) },
    include: { ratingsReceived: true, _count: { select: { members: { where: { active: true } } } } },
    orderBy: { createdAt: "desc" }, take: 30,
  });
  return (
    <div className="container-page py-8">
      <Flash searchParams={sp} />
      <div className="mb-4 flex items-center justify-between"><h1 className="h1">Đội của tôi</h1><Link href="/doi/moi" className="btn-primary">+ Tạo đội</Link></div>
      {!user ? <Empty title="Đăng nhập để quản lý đội bóng" action={{ href: "/dang-nhap?next=/doi", label: "Đăng nhập" }}>Điểm danh, chia tiền sân, thu quỹ tháng, biết ai còn nợ.</Empty>
        : mine.length === 0 ? <Empty title="Bạn chưa ở đội nào" action={{ href: "/doi/moi", label: "Tạo đội đầu tiên" }}>Hoặc nhờ đội trưởng gửi link mời.</Empty>
        : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {mine.map((m) => (
              <Link key={m.id} href={`/doi/${m.team.slug}`} className="card flex items-center gap-3 hover:border-brand-500">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-600 text-lg font-bold text-white">{m.team.name.slice(0, 2).toUpperCase()}</span>
                <div><p className="font-bold">{m.team.name}</p><p className="muted">{m.team._count.members} thành viên · {m.team.district}</p></div>
                <span className="ml-auto"><Badge tone={m.role === "MEMBER" ? "gray" : "green"}>{label(TEAM_ROLES, m.role)}</Badge></span>
              </Link>
            ))}
          </div>
        )}
      <div className="mb-3 mt-10 flex flex-wrap items-end justify-between gap-2">
        <h2 className="h2">Các đội đang hoạt động</h2>
        <form className="flex gap-2"><input name="q" defaultValue={sp.q} className="input" placeholder="Tìm tên đội" aria-label="Tìm tên đội" /><button className="btn-secondary">Tìm</button></form>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {publicTeams.map((t) => {
          const rep = computeReputation(t.ratingsReceived);
          return (
            <Link key={t.id} href={`/doi/${t.slug}`} className="card hover:border-brand-500">
              <p className="font-bold">{t.name}</p>
              <p className="muted">{t.district}, {t.province} · {t._count.members} người</p>
              <div className="mt-1 flex items-center gap-2"><Badge>{label(LEVELS, t.level)}</Badge><Stars value={rep.score} count={rep.count} /></div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
