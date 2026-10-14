import Link from "next/link";
import { db } from "@/lib/server/db";
import { getCurrentUser } from "@/lib/server/auth";
import { Flash } from "@/components/flash";
import { Empty } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { joinTeamAction } from "@/app/(site)/doi/actions";

export const metadata = { title: "Lời mời vào đội" };

export default async function InvitePage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ error?: string; ok?: string }> }) {
  const { code } = await params;
  const sp = await searchParams;
  const team = await db.team.findUnique({ where: { inviteCode: code }, include: { members: { where: { active: true } } } });
  if (!team) return <div className="container-page max-w-md py-12"><Empty title="Link mời không hợp lệ hoặc đã hết hạn" action={{ href: "/doi", label: "Về trang đội" }} /></div>;
  const user = await getCurrentUser();
  const guests = team.members.filter((m) => !m.userId);
  return (
    <div className="container-page max-w-md py-12">
      <Flash searchParams={sp} />
      <div className="card text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-brand-600 text-2xl font-bold text-white">{team.name.slice(0, 2).toUpperCase()}</span>
        <h1 className="h1 mt-3">{team.name}</h1>
        <p className="muted">{team.district}, {team.province} · {team.members.length} thành viên</p>
        {!user ? (
          <div className="mt-5 space-y-2">
            <p className="text-sm">Đăng nhập hoặc tạo tài khoản để vào đội.</p>
            <Link className="btn-primary w-full" href={`/dang-ky?next=/moi/${code}`}>Tạo tài khoản</Link>
            <Link className="btn-secondary w-full" href={`/dang-nhap?next=/moi/${code}`}>Tôi đã có tài khoản</Link>
          </div>
        ) : (
          <form action={joinTeamAction.bind(null, code)} className="mt-5 space-y-3 text-left">
            {guests.length > 0 && (
              <div>
                <label className="label" htmlFor="claimMemberId">Đội trưởng đã thêm tên bạn trước? Chọn để nhận lại lịch sử quỹ:</label>
                <select id="claimMemberId" name="claimMemberId" className="input" defaultValue="">
                  <option value="">Không, tôi là thành viên mới ({user.name})</option>
                  {guests.map((g) => <option key={g.id} value={g.id}>Tôi là {g.displayName}</option>)}
                </select>
              </div>
            )}
            <SubmitButton className="btn-primary w-full">Vào đội {team.name}</SubmitButton>
          </form>
        )}
      </div>
    </div>
  );
}
