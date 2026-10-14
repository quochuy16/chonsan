import Link from "next/link";
import { db } from "@/lib/server/db";
import { COST_SPLIT, LEVELS, label } from "@/lib/domain/constants";
import { formatVND } from "@/lib/domain/money";
import { computeReputation } from "@/lib/domain/reputation";
import { formatDateTime } from "@/lib/domain/time";
import { Flash } from "@/components/flash";
import { LocationSelect } from "@/components/location-select";
import { Badge, Empty, Stars, Tabs } from "@/components/ui";

export const metadata = { title: "Kèo – tìm đối, tìm người đá ghép", description: "Ghép kèo bóng đá phủi: tìm đội đối cùng trình độ, tìm người đá ghép gần bạn. Có điểm uy tín, không cá cược." };

type SP = { tab?: string; province?: string; district?: string; size?: string; ok?: string; error?: string };

export default async function KeoPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const tab = sp.tab === "nguoi" ? "nguoi" : "doi";
  const where = { status: "OPEN", start: { gt: new Date() }, ...(sp.province ? { province: sp.province } : {}), ...(sp.district ? { district: sp.district } : {}) };
  const qs = (t: string) => `/keo?${new URLSearchParams({ ...(sp.province ? { province: sp.province } : {}), ...(sp.district ? { district: sp.district } : {}), tab: t })}`;
  return (
    <div className="container-page py-6">
      <Flash searchParams={sp} />
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h1 className="h1">Kèo</h1>
        <div className="flex gap-2"><Link href="/keo/moi" className="btn-primary">+ Đăng tìm đối</Link><Link href="/keo/nguoi/moi" className="btn-secondary">+ Tìm người</Link></div>
      </div>
      <p className="mb-4 rounded-xl bg-gray-100 px-3 py-2 text-xs text-gray-600">🚫 ChọnSân không chấp nhận kèo có cược/độ. Bài vi phạm sẽ bị ẩn và đội bị khóa.</p>
      <Tabs active={tab} items={[{ key: "doi", label: "Tìm đối", href: qs("doi") }, { key: "nguoi", label: "Tìm người đá ghép", href: qs("nguoi") }]} />
      <form className="card mb-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
        <input type="hidden" name="tab" value={tab} />
        <div className="sm:col-span-3"><LocationSelect province={sp.province} district={sp.district} allowAll /></div>
        <div className="flex items-end"><button className="btn-secondary w-full">Lọc</button></div>
      </form>
      {tab === "doi" ? <MatchList where={where} /> : <PlayerList where={where} />}
    </div>
  );
}

async function MatchList({ where }: { where: object }) {
  const posts = await db.matchPost.findMany({ where, include: { team: { include: { ratingsReceived: true } }, _count: { select: { requests: true } } }, orderBy: { start: "asc" }, take: 50 });
  if (posts.length === 0) return <Empty title="Chưa có kèo nào ở đây" action={{ href: "/keo/moi", label: "Đăng kèo đầu tiên" }} />;
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {posts.map((p) => {
        const rep = computeReputation(p.team.ratingsReceived);
        return (
          <Link key={p.id} href={`/keo/${p.id}`} className="card hover:border-brand-500">
            <div className="flex items-start justify-between gap-2">
              <p className="font-bold">{p.team.name}</p><Stars value={rep.score} count={rep.count} />
            </div>
            <p className="text-sm">⏰ <strong>{formatDateTime(p.start)}</strong> · Sân {p.pitchSize}</p>
            <p className="muted">📍 {p.venueText} · {p.district}</p>
            <div className="mt-2 flex flex-wrap gap-1.5"><Badge>{label(LEVELS, p.level)}</Badge><Badge tone="blue">{label(COST_SPLIT, p.costSplit)}</Badge>{rep.noShows > 0 && <Badge tone="red">{rep.noShows} lần bùng</Badge>}{p._count.requests > 0 && <Badge tone="amber">{p._count.requests} đội hỏi</Badge>}</div>
          </Link>
        );
      })}
    </div>
  );
}

async function PlayerList({ where }: { where: object }) {
  const posts = await db.playerPost.findMany({ where, include: { team: true, author: { select: { name: true } }, _count: { select: { requests: { where: { status: "ACCEPTED" } } } } }, orderBy: { start: "asc" }, take: 50 });
  if (posts.length === 0) return <Empty title="Chưa có bài tìm người" action={{ href: "/keo/nguoi/moi", label: "Đăng tìm người" }} />;
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {posts.map((p) => (
        <Link key={p.id} href={`/keo/nguoi/${p.id}`} className="card hover:border-brand-500">
          <p className="font-bold">Cần {p.needed - p._count.requests}/{p.needed} người {p.position && <span className="font-normal text-gray-500">· {p.position}</span>}</p>
          <p className="text-sm">⏰ <strong>{formatDateTime(p.start)}</strong> · {p.team?.name ?? p.author.name}</p>
          <p className="muted">📍 {p.venueText} · {p.district}</p>
          <div className="mt-2 flex gap-1.5"><Badge>{label(LEVELS, p.level)}</Badge><Badge tone="green">{p.feePerPerson ? `${formatVND(p.feePerPerson)}/người` : "Miễn phí"}</Badge></div>
        </Link>
      ))}
    </div>
  );
}
