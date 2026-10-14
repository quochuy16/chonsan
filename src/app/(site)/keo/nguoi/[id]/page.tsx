import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/server/db";
import { getCurrentUser } from "@/lib/server/auth";
import { LEVELS, label } from "@/lib/domain/constants";
import { formatVND } from "@/lib/domain/money";
import { formatDateLong, formatTime } from "@/lib/domain/time";
import { Flash } from "@/components/flash";
import { ReportForm } from "@/components/report-form";
import { Badge } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { closePlayerPostAction, decideJoinAction, requestJoinAction } from "../../actions";

export const metadata = { title: "Tìm người đá ghép" };

export default async function PlayerPostPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const post = await db.playerPost.findUnique({
    where: { id },
    include: { author: { select: { id: true, name: true, phone: true } }, requests: { include: { user: { select: { name: true, phone: true, skillLevel: true, position: true } } }, orderBy: { createdAt: "asc" } } },
  });
  if (!post || post.status === "HIDDEN") notFound();
  const user = await getCurrentUser();
  const isAuthor = user?.id === post.author.id;
  const mine = post.requests.find((r) => r.userId === user?.id);
  const accepted = post.requests.filter((r) => r.status === "ACCEPTED");
  return (
    <div className="container-page max-w-3xl py-8">
      <Flash searchParams={sp} />
      <div className="card">
        <div className="flex items-start justify-between gap-2">
          <div><p className="muted">Tìm người đá ghép · {post.teamName ? `${post.teamName} (${post.author.name})` : post.author.name}</p>
            <h1 className="h1">Cần {post.needed} người {post.position && <span className="text-lg font-normal text-gray-500">· {post.position}</span>}</h1></div>
          <Badge tone={post.status === "OPEN" ? "green" : "gray"}>{post.status === "OPEN" ? `Còn ${post.needed - accepted.length} chỗ` : post.status === "FULL" ? "Đã đủ người" : "Đã đóng"}</Badge>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div><dt className="muted">Thời gian</dt><dd className="font-semibold">{formatTime(post.start)}, {formatDateLong(post.start)}</dd></div>
          <div><dt className="muted">Sân</dt><dd className="font-semibold">{post.venueText}</dd><dd className="text-gray-500">{post.district}, {post.province}</dd></div>
          <div><dt className="muted">Trình độ</dt><dd>{label(LEVELS, post.level)}</dd></div>
          <div><dt className="muted">Góp</dt><dd>{post.feePerPerson ? `${formatVND(post.feePerPerson)}/người` : "Miễn phí"}</dd></div>
          {post.note && <div className="col-span-2"><dt className="muted">Ghi chú</dt><dd>{post.note}</dd></div>}
          {mine?.status === "ACCEPTED" && <div className="col-span-2 rounded-xl bg-brand-50 p-3">✅ Bạn đã được nhận. Liên hệ {post.author.name}: <a className="font-semibold text-brand-700" href={`tel:${post.author.phone}`}>{post.author.phone}</a></div>}
        </dl>
      </div>
      {isAuthor ? (
        <section className="card mt-4">
          <h2 className="h2 mb-2">Người xin vào ({post.requests.length})</h2>
          {post.requests.length === 0 ? <p className="muted">Chưa có ai.</p> : (
            <ul className="divide-y divide-gray-100">
              {post.requests.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <span><strong>{r.user.name}</strong> {r.user.position && `· ${r.user.position}`} {r.user.skillLevel && `· ${label(LEVELS, r.user.skillLevel)}`}{r.status === "ACCEPTED" && <> · <a className="text-brand-700" href={`tel:${r.user.phone}`}>{r.user.phone}</a></>}{r.message && <span className="block text-gray-600">“{r.message}”</span>}</span>
                  {r.status === "PENDING" ? (
                    <span className="flex gap-1">
                      <form action={decideJoinAction.bind(null, post.id, r.id, true)}><SubmitButton className="btn-primary btn-sm">Nhận</SubmitButton></form>
                      <form action={decideJoinAction.bind(null, post.id, r.id, false)}><SubmitButton className="btn-ghost btn-sm">Từ chối</SubmitButton></form>
                    </span>
                  ) : <Badge tone={r.status === "ACCEPTED" ? "green" : "gray"}>{r.status === "ACCEPTED" ? "Đã nhận" : "Đã từ chối"}</Badge>}
                </li>
              ))}
            </ul>
          )}
          {post.status === "OPEN" && <form action={closePlayerPostAction.bind(null, post.id)} className="mt-3"><SubmitButton className="btn-danger btn-sm" confirm="Đóng bài này?">Đóng bài</SubmitButton></form>}
        </section>
      ) : post.status === "OPEN" && (
        <section className="card mt-4">
          {!user ? <Link className="btn-primary" href={`/dang-nhap?next=/keo/nguoi/${post.id}`}>Đăng nhập để xin vào</Link>
            : mine ? <p className="text-sm">Bạn đã gửi yêu cầu · <Badge tone={mine.status === "ACCEPTED" ? "green" : mine.status === "REJECTED" ? "red" : "amber"}>{mine.status === "PENDING" ? "Chờ duyệt" : mine.status === "ACCEPTED" ? "Đã nhận" : "Bị từ chối"}</Badge></p>
            : (
              <form action={requestJoinAction.bind(null, post.id)} className="space-y-2">
                <input name="message" className="input" placeholder="Giới thiệu ngắn: vị trí, trình độ" aria-label="Lời nhắn" />
                <SubmitButton>Xin vào đá</SubmitButton>
              </form>
            )}
        </section>
      )}
      {user && !isAuthor && <div className="mt-4"><ReportForm targetType="PLAYER_POST" targetId={post.id} back={`/keo/nguoi/${post.id}`} /></div>}
    </div>
  );
}
