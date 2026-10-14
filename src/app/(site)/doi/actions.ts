"use server";
import { redirect } from "next/navigation";
import { db } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { requireTeamRole } from "@/lib/server/team";
import { bool, done, fail, int, str } from "@/lib/server/flash";
import { notify } from "@/lib/server/notify";
import { LEVELS, TEAM_ROLES, isKey } from "@/lib/domain/constants";
import { isValidLocation } from "@/lib/domain/locations";
import { BANKS } from "@/lib/domain/vietqr";
import { randomCode, slugify } from "@/lib/domain/text";

function teamFields(form: FormData, back: string) {
  const name = str(form, "name");
  const province = str(form, "province");
  const district = str(form, "district");
  const level = str(form, "level");
  const bankBin = str(form, "bankBin");
  if (name.length < 2) fail(back, "Tên đội quá ngắn");
  if (!isValidLocation(province, district)) fail(back, "Khu vực không hợp lệ");
  return {
    name, province, district,
    level: isKey(LEVELS, level) ? level : "TRUNG_BINH",
    homeVenue: str(form, "homeVenue").slice(0, 120),
    description: str(form, "description").slice(0, 1000),
    isPublic: bool(form, "isPublic"),
    monthlyFee: Math.max(0, int(form, "monthlyFee")),
    bankBin: bankBin && BANKS[bankBin] ? bankBin : null,
    bankAccount: str(form, "bankAccount").replace(/\s/g, "") || null,
    bankAccountName: str(form, "bankAccountName").toUpperCase() || null,
  };
}

export async function createTeamAction(form: FormData) {
  const user = await requireUser("/doi/moi");
  const data = teamFields(form, "/doi/moi");
  let slug = slugify(data.name);
  if (!slug || (await db.team.findUnique({ where: { slug } }))) slug = `${slug || "doi"}-${randomCode(4).toLowerCase()}`;
  const team = await db.team.create({
    data: { ...data, slug, inviteCode: randomCode(8), members: { create: { userId: user.id, displayName: user.name, role: "CAPTAIN" } } },
  });
  redirect(`/doi/${team.slug}/quan-ly?ok=${encodeURIComponent("Đã tạo đội! Gửi link mời cho anh em nhé.")}`);
}

export async function updateTeamAction(teamId: string, form: FormData) {
  const user = await requireUser("/doi");
  const team = await db.team.findUniqueOrThrow({ where: { id: teamId } });
  const back = `/doi/${team.slug}/quan-ly`;
  await requireTeamRole(teamId, user.id, "captain", back);
  await db.team.update({ where: { id: teamId }, data: teamFields(form, back) });
  done(back, "Đã lưu thông tin đội");
}

export async function regenerateInviteAction(teamId: string) {
  const user = await requireUser("/doi");
  const team = await db.team.findUniqueOrThrow({ where: { id: teamId } });
  await requireTeamRole(teamId, user.id, "captain", `/doi/${team.slug}/quan-ly`);
  await db.team.update({ where: { id: teamId }, data: { inviteCode: randomCode(8) } });
  done(`/doi/${team.slug}/quan-ly`, "Đã tạo link mời mới, link cũ hết hiệu lực");
}

export async function joinTeamAction(code: string, form: FormData) {
  const user = await requireUser(`/moi/${code}`);
  const team = await db.team.findUnique({ where: { inviteCode: code } });
  if (!team) fail("/doi", "Link mời không hợp lệ hoặc đã hết hạn");
  const existing = await db.teamMember.findFirst({ where: { teamId: team.id, userId: user.id } });
  if (existing?.active) redirect(`/doi/${team.slug}`);
  const claimId = str(form, "claimMemberId");
  if (existing) {
    await db.teamMember.update({ where: { id: existing.id }, data: { active: true } });
  } else if (claimId) {
    const guest = await db.teamMember.findFirst({ where: { id: claimId, teamId: team.id, userId: null, active: true } });
    if (!guest) fail(`/moi/${code}`, "Thành viên này đã có người nhận");
    await db.teamMember.update({ where: { id: guest.id }, data: { userId: user.id } });
  } else {
    await db.teamMember.create({ data: { teamId: team.id, userId: user.id, displayName: user.name } });
  }
  const captains = await db.teamMember.findMany({ where: { teamId: team.id, role: "CAPTAIN", userId: { not: null } } });
  for (const c of captains) await notify(c.userId, `${user.name} đã vào đội ${team.name}`, "", `/doi/${team.slug}/quan-ly`);
  redirect(`/doi/${team.slug}?ok=${encodeURIComponent(`Chào mừng bạn đến với ${team.name}!`)}`);
}

export async function addGuestMemberAction(teamId: string, form: FormData) {
  const user = await requireUser("/doi");
  const team = await db.team.findUniqueOrThrow({ where: { id: teamId } });
  const back = `/doi/${team.slug}/quan-ly`;
  await requireTeamRole(teamId, user.id, "captain", back);
  const name = str(form, "displayName");
  if (name.length < 2) fail(back, "Nhập tên thành viên");
  await db.teamMember.create({ data: { teamId, displayName: name, jerseyNo: int(form, "jerseyNo") || null } });
  done(back, `Đã thêm ${name}. Khi người này vào bằng link mời, họ có thể nhận lại tên này.`);
}

export async function updateMemberAction(teamId: string, memberId: string, form: FormData) {
  const user = await requireUser("/doi");
  const team = await db.team.findUniqueOrThrow({ where: { id: teamId } });
  const back = `/doi/${team.slug}/quan-ly`;
  const me = await requireTeamRole(teamId, user.id, "captain", back);
  const role = str(form, "role");
  const target = await db.teamMember.findFirst({ where: { id: memberId, teamId } });
  if (!target) fail(back, "Không tìm thấy thành viên");
  if (target.id === me.id && role !== "CAPTAIN") {
    const others = await db.teamMember.count({ where: { teamId, role: "CAPTAIN", active: true, id: { not: me.id } } });
    if (!others) fail(back, "Đội cần ít nhất 1 đội trưởng");
  }
  await db.teamMember.update({
    where: { id: memberId },
    data: { role: isKey(TEAM_ROLES, role) ? role : target.role, jerseyNo: int(form, "jerseyNo") || null, displayName: str(form, "displayName") || target.displayName },
  });
  done(back, "Đã cập nhật thành viên");
}

export async function removeMemberAction(teamId: string, memberId: string) {
  const user = await requireUser("/doi");
  const team = await db.team.findUniqueOrThrow({ where: { id: teamId } });
  const back = `/doi/${team.slug}/quan-ly`;
  const me = await requireTeamRole(teamId, user.id, "captain", back);
  if (me.id === memberId) fail(back, "Dùng nút Rời đội để tự rời");
  await db.teamMember.updateMany({ where: { id: memberId, teamId }, data: { active: false } });
  done(back, "Đã cho thành viên rời đội (lịch sử quỹ vẫn giữ)");
}

export async function leaveTeamAction(teamId: string) {
  const user = await requireUser("/doi");
  const team = await db.team.findUniqueOrThrow({ where: { id: teamId } });
  const me = await requireTeamRole(teamId, user.id, "member", `/doi/${team.slug}`);
  if (me.role === "CAPTAIN" && !(await db.teamMember.count({ where: { teamId, role: "CAPTAIN", active: true, id: { not: me.id } } })))
    fail(`/doi/${team.slug}/quan-ly`, "Hãy chuyển quyền đội trưởng cho người khác trước khi rời đội");
  await db.teamMember.update({ where: { id: me.id }, data: { active: false } });
  done("/doi", `Bạn đã rời ${team.name}`);
}
