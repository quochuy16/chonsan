import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { db } from "@/lib/server/db";
import { loadTeamContext } from "@/lib/server/team";
import { TEAM_ROLES } from "@/lib/domain/constants";
import { CopyButton } from "@/components/copy-button";
import { Flash } from "@/components/flash";
import { SubmitButton } from "@/components/submit-button";
import { TeamForm } from "../../team-form";
import { addGuestMemberAction, regenerateInviteAction, removeMemberAction, updateMemberAction, updateTeamAction } from "../../actions";

export const metadata = { title: "Quản lý đội" };

export default async function ManageTeam({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const { team, isCaptain } = await loadTeamContext(slug, { memberOnly: true });
  if (!isCaptain) notFound();
  const members = await db.teamMember.findMany({ where: { teamId: team.id, active: true }, include: { user: { select: { email: true } } }, orderBy: { displayName: "asc" } });
  const h = await headers();
  const origin = process.env.SITE_URL ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const invite = `${origin}/moi/${team.inviteCode}`;
  return (
    <div className="space-y-5">
      <Flash searchParams={sp} />
      <section className="card border-brand-200 bg-brand-50">
        <h2 className="h2 mb-1">Link mời vào đội</h2>
        <p className="muted mb-2">Gửi link này vào nhóm Zalo/Messenger của đội.</p>
        <div className="flex flex-wrap items-center gap-2">
          <code className="rounded-lg bg-white px-3 py-2 text-sm">{invite}</code>
          <CopyButton text={`Vào đội ${team.name} trên ChọnSân để điểm danh & xem quỹ: ${invite}`} label="Chép link" />
          <form action={regenerateInviteAction.bind(null, team.id)}><SubmitButton className="btn-ghost btn-sm" confirm="Tạo link mới? Link cũ sẽ không dùng được nữa.">Đổi link</SubmitButton></form>
        </div>
      </section>
      <section className="card">
        <h2 className="h2 mb-3">Thành viên ({members.length})</h2>
        <ul className="divide-y divide-gray-100">
          {members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-2 py-2">
              <form action={updateMemberAction.bind(null, team.id, m.id)} className="flex flex-1 flex-wrap items-center gap-2">
                <input name="jerseyNo" defaultValue={m.jerseyNo ?? ""} className="input w-16 py-1.5" placeholder="Số" aria-label="Số áo" />
                <input name="displayName" defaultValue={m.displayName} className="input w-44 py-1.5" aria-label="Tên" />
                <select name="role" defaultValue={m.role} className="input w-36 py-1.5" aria-label="Vai trò">{Object.entries(TEAM_ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                <span className="text-xs text-gray-400">{m.user?.email ?? "chưa có tài khoản"}</span>
                <SubmitButton className="btn-secondary btn-sm">Lưu</SubmitButton>
              </form>
              <form action={removeMemberAction.bind(null, team.id, m.id)}><SubmitButton className="btn-ghost btn-sm text-red-600" confirm={`Cho ${m.displayName} rời đội?`}>Xóa</SubmitButton></form>
            </li>
          ))}
        </ul>
        <form action={addGuestMemberAction.bind(null, team.id)} className="mt-3 flex flex-wrap gap-2">
          <input name="displayName" className="input flex-1" placeholder="Thêm người chưa có tài khoản (chỉ tên)" aria-label="Tên thành viên" />
          <input name="jerseyNo" className="input w-20" placeholder="Số áo" aria-label="Số áo" />
          <SubmitButton className="btn-secondary">+ Thêm</SubmitButton>
        </form>
      </section>
      <section className="card">
        <h2 className="h2 mb-3">Thông tin đội</h2>
        <TeamForm action={updateTeamAction.bind(null, team.id)} team={team} submitLabel="Lưu thông tin" />
      </section>
    </div>
  );
}
