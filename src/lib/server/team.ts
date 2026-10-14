import { notFound } from "next/navigation";
import { db } from "./db";
import { getCurrentUser } from "./auth";
import { canManageFund, canManageTeam } from "./permissions";
import { fail } from "./flash";

/** Tải đội + quyền của người xem. memberOnly: trang chỉ thành viên được xem (quỹ, lịch). */
export async function loadTeamContext(slug: string, opts: { memberOnly?: boolean } = {}) {
  const team = await db.team.findUnique({ where: { slug } });
  if (!team) notFound();
  const user = await getCurrentUser();
  const me = user ? await db.teamMember.findFirst({ where: { teamId: team.id, userId: user.id, active: true } }) : null;
  const isAdmin = user?.role === "ADMIN";
  if (opts.memberOnly && !me && !isAdmin) notFound();
  if (!team.isPublic && !me && !isAdmin) notFound();
  return { team, user, me, isCaptain: canManageTeam(me?.role), canFund: canManageFund(me?.role) };
}

/** Dùng trong Server Action: bắt buộc là thành viên (và có vai trò yêu cầu) */
export async function requireTeamRole(teamId: string, userId: string, need: "member" | "fund" | "captain", back: string) {
  const me = await db.teamMember.findFirst({ where: { teamId, userId, active: true } });
  if (!me) fail(back, "Bạn không phải thành viên đội này");
  if (need === "fund" && !canManageFund(me.role)) fail(back, "Chỉ đội trưởng hoặc thủ quỹ được làm việc này");
  if (need === "captain" && !canManageTeam(me.role)) fail(back, "Chỉ đội trưởng được làm việc này");
  return me;
}

export async function audit(teamId: string, actorName: string, action: string, detail: string) {
  await db.fundAuditLog.create({ data: { teamId, actorName, action, detail } });
}
