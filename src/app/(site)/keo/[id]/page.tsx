import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/server/db";
import { getCurrentUser } from "@/lib/server/auth";
import { COST_SPLIT, LEVELS, label } from "@/lib/domain/constants";
import { computeReputation } from "@/lib/domain/reputation";
import { formatDateLong, formatTime } from "@/lib/domain/time";
import { Flash } from "@/components/flash";
import { ReportForm } from "@/components/report-form";
import { Badge, Stars } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { acceptMatchAction, cancelMatchPostAction, rateTeamAction, requestMatchAction } from "../actions";

export const metadata = { title: "Chi tiết kèo" };

export default async function MatchPostPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const post = await db.matchPost.findUnique({
    where: { id },
    include: { team: { include: { ratingsReceived: true } }, requests: { include: { team: { include: { ratingsReceived: true } } }, orderBy: { createdAt: "asc" } }, ratings: true },
  });
  if (!post || post.status === "HIDDEN") notFound();
  const user = await getCurrentUser();
  const myManaged = user ? await db.teamMember.findMany({ where: { userId: user.id, active: true, role: { in: ["CAPTAIN", "TREASURER"] } }, include: { team: true } }) : [];
  const isHost = myManaged.some((m) => m.teamId === post.teamId);
  const accepted = post.requests.find((r) => r.status === "ACCEPTED");
  const myGuestTeam = accepted && myManaged.find((m) => m.teamId === accepted.teamId);
  const involved = isHost || !!myGuestTeam;
  const captainsOf = async (teamId: string) => db.teamMember.findMany({ where: { teamId, active: true, role: "CAPTAIN" }, include: { user: { select: { name: true, phone: true } } } });
  const contacts = accepted && involved ? await captainsOf(isHost ? accepted.teamId : post.teamId) : [];
  const myRatingTeamId = isHost ? post.teamId : myGuestTeam?.teamId;
  const myRating = post.ratings.find((r) => r.fromTeamId === myRatingTeamId);
  const canRate = post.status === "MATCHED" && involved && post.start < new Date();
  const hostRep = computeReputation(post.team.ratingsReceived);
  const requestable = myManaged.filter((m) => m.teamId !== post.teamId);

  return (
    <div className="container-page max-w-3xl py-8">
      <Flash searchParams={sp} />
      <div className="card">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="muted">Kèo tìm đối</p>
            <h1 className="h1"><Link href={`/doi/${post.team.slug}`} className="hover:text-brand-700">{post.team.name}</Link></h1>
            <div className="mt-1 flex items-center gap-2"><Stars value={hostRep.score} count={hostRep.count} />{hostRep.noShows > 0 && <Badge tone="red">{hostRep.noShows} lần bùng</Badge>}</div>
          </div>
          <Badge tone={post.status === "OPEN" ? "green" : post.status === "MATCHED" ? "blue" : "gray"}>{post.status === "OPEN" ? "Đang tìm đối" : post.status === "MATCHED" ? "Đã chốt" : "Đã hủy"}</Badge>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div><dt className="muted">Thời gian</dt><dd className="font-semibold">{formatTime(post.start)}, {formatDateLong(post.start)}</dd></div>
          <div><dt className="muted">Sân</dt><dd className="font-semibold">{post.venueText} (sân {post.pitchSize})</dd><dd className="text-gray-500">{post.district}, {post.province}</dd></div>
          <div><dt className="muted">Trình độ</dt><dd>{label(LEVELS, post.level)}</dd></div>
          <div><dt className="muted">Tiền sân</dt><dd>{label(COST_SPLIT, post.costSplit)}</dd></div>
          {post.note && <div className="col-span-2"><dt className="muted">Ghi chú</dt><dd>{post.note}</dd></div>}
        </dl>
        {contacts.length > 0 && (
          <div className="mt-4 rounded-xl bg-brand-50 p-3 text-sm">
            <p className="font-semibold">Liên hệ đội {isHost ? accepted!.team.name : post.team.name}:</p>
            {contacts.map((c) => <p key={c.id}>{c.user?.name ?? c.displayName}: <a className="font-semibold text-brand-700" href={`tel:${c.user?.phone}`}>{c.user?.phone}</a></p>)}
          </div>
        )}
      </div>

      {isHost && post.requests.length > 0 && (
        <section className="card mt-4">
          <h2 className="h2 mb-2">Đội muốn nhận kèo ({post.requests.length})</h2>
          <ul className="divide-y divide-gray-100">
            {post.requests.map((r) => {
              const rep = computeReputation(r.team.ratingsReceived);
              return (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <Link href={`/doi/${r.team.slug}`} className="font-semibold text-brand-700">{r.team.name}</Link>{" "}
                    <span className="text-sm text-gray-500">{label(LEVELS, r.team.level)} · {r.team.district}</span>
                    <div className="flex items-center gap-2"><Stars value={rep.score} count={rep.count} />{rep.noShows > 0 && <Badge tone="red">{rep.noShows} lần bùng</Badge>}</div>
                    {r.message && <p className="text-sm text-gray-700">“{r.message}”</p>}
                  </div>
                  {post.status === "OPEN" ? (
                    <form action={acceptMatchAction.bind(null, post.id, r.id)}><SubmitButton className="btn-primary btn-sm" confirm={`Chốt kèo với ${r.team.name}?`}>Chốt kèo</SubmitButton></form>
                  ) : <Badge tone={r.status === "ACCEPTED" ? "green" : "gray"}>{r.status === "ACCEPTED" ? "Đã chốt" : "Không chọn"}</Badge>}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {!isHost && post.status === "OPEN" && (
        <section className="card mt-4">
          <h2 className="h2 mb-2">Nhận kèo</h2>
          {!user ? <Link href={`/dang-nhap?next=/keo/${post.id}`} className="btn-primary">Đăng nhập để nhận kèo</Link>
            : requestable.length === 0 ? <p className="muted">Bạn cần là đội trưởng/thủ quỹ của một đội. <Link className="text-brand-700" href="/doi/moi">Tạo đội</Link></p>
            : (
              <form action={requestMatchAction.bind(null, post.id)} className="space-y-2">
                <select name="teamId" className="input" aria-label="Đội của bạn">{requestable.map((m) => <option key={m.teamId} value={m.teamId}>{m.team.name}</option>)}</select>
                <input name="message" className="input" placeholder="Lời nhắn (VD: đội mình trình trung bình, áo đỏ)" aria-label="Lời nhắn" />
                <SubmitButton>Gửi nhận kèo</SubmitButton>
              </form>
            )}
        </section>
      )}

      {canRate && (
        <section className="card mt-4">
          <h2 className="h2 mb-1">Đánh giá đội {isHost ? accepted!.team.name : post.team.name}</h2>
          <p className="muted mb-3">{myRating ? "Bạn đã đánh giá — gửi lại để sửa." : "Giúp cộng đồng biết đội nào uy tín."}</p>
          <form action={rateTeamAction.bind(null, post.id)} className="space-y-3">
            <input type="hidden" name="fromTeamId" value={myRatingTeamId} />
            {([["punctual", "Đúng giờ"], ["fairplay", "Fair-play"], ["levelMatch", "Đúng trình độ đã khai"]] as const).map(([k, l]) => (
              <div key={k} className="flex items-center justify-between text-sm"><span>{l}</span>
                <select name={k} defaultValue={myRating?.[k] ?? 5} className="input w-24 py-1.5" aria-label={l}>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n}★</option>)}</select></div>
            ))}
            <label className="flex items-center gap-2 text-sm text-red-700"><input type="checkbox" name="noShow" defaultChecked={myRating?.noShow} /> Đội này bùng kèo (không đến)</label>
            <input name="comment" defaultValue={myRating?.comment} className="input" placeholder="Nhận xét" aria-label="Nhận xét" />
            <SubmitButton>Gửi đánh giá</SubmitButton>
          </form>
        </section>
      )}

      <div className="mt-4 flex items-center justify-between">
        {isHost && post.status === "OPEN" ? <form action={cancelMatchPostAction.bind(null, post.id)}><SubmitButton className="btn-danger btn-sm" confirm="Hủy kèo này?">Hủy kèo</SubmitButton></form> : <span />}
        {user && <ReportForm targetType="MATCH_POST" targetId={post.id} back={`/keo/${post.id}`} />}
      </div>
    </div>
  );
}
