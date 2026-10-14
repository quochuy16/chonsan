"use server";
import { db } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { audit, requireTeamRole } from "@/lib/server/team";
import { done, fail, int, str } from "@/lib/server/flash";
import { notify } from "@/lib/server/notify";
import { RSVP, isKey } from "@/lib/domain/constants";
import { splitEvenly } from "@/lib/domain/fund";
import { formatVND } from "@/lib/domain/money";
import { formatDateTime, fromVN, hhmmToMinutes, isDateKey } from "@/lib/domain/time";

async function teamOf(teamId: string) {
  return db.team.findUniqueOrThrow({ where: { id: teamId } });
}

export async function createEventAction(teamId: string, form: FormData) {
  const user = await requireUser("/doi");
  const team = await teamOf(teamId);
  const back = `/doi/${team.slug}/lich`;
  await requireTeamRole(teamId, user.id, "fund", back);
  const date = str(form, "date");
  const time = str(form, "time");
  if (!isDateKey(date) || !time) fail(back, "Chọn ngày giờ");
  const event = await db.teamEvent.create({
    data: {
      teamId, title: str(form, "title") || "Buổi đá", start: fromVN(date, hhmmToMinutes(time)),
      venueText: str(form, "venueText").slice(0, 120), opponent: str(form, "opponent").slice(0, 80), cost: Math.max(0, int(form, "cost")),
    },
  });
  const members = await db.teamMember.findMany({ where: { teamId, active: true, userId: { not: null } } });
  for (const m of members) if (m.userId !== user.id) await notify(m.userId, `${team.name}: ${event.title} ${formatDateTime(event.start)}`, "Bấm để điểm danh", `/doi/${team.slug}/lich`);
  done(back, "Đã tạo buổi đá và gửi thông báo điểm danh");
}

export async function rsvpAction(teamId: string, eventId: string, response: string) {
  const user = await requireUser("/doi");
  const team = await teamOf(teamId);
  const back = `/doi/${team.slug}/lich`;
  const me = await requireTeamRole(teamId, user.id, "member", back);
  if (!isKey(RSVP, response)) fail(back, "Lựa chọn không hợp lệ");
  const event = await db.teamEvent.findFirst({ where: { id: eventId, teamId } });
  if (!event || event.finished) fail(back, "Buổi đá đã kết thúc");
  await db.attendance.upsert({
    where: { eventId_memberId: { eventId, memberId: me.id } },
    create: { eventId, memberId: me.id, response },
    update: { response },
  });
  done(back, `Đã điểm danh: ${RSVP[response]}`);
}

/** Chốt buổi đá: ai có mặt, tỉ số, bàn thắng; tùy chọn chia tiền sân cho người có mặt */
export async function finishEventAction(teamId: string, eventId: string, form: FormData) {
  const user = await requireUser("/doi");
  const team = await teamOf(teamId);
  const back = `/doi/${team.slug}/lich`;
  await requireTeamRole(teamId, user.id, "fund", back);
  const event = await db.teamEvent.findFirst({ where: { id: eventId, teamId } });
  if (!event) fail(back, "Không tìm thấy buổi đá");
  const members = await db.teamMember.findMany({ where: { teamId, active: true } });
  const attended = members.filter((m) => form.get(`att_${m.id}`));
  const cost = Math.max(0, int(form, "cost", event.cost));
  const split = form.get("split") === "on" && !event.chargesIssued && cost > 0 && attended.length > 0;
  const share = split ? splitEvenly(cost, attended.length) : 0;
  const sf = str(form, "scoreFor"), sa = str(form, "scoreAgainst");

  await db.$transaction(async (tx) => {
    for (const m of members) {
      const data = { attended: attended.includes(m), goals: Math.max(0, int(form, `g_${m.id}`)), assists: Math.max(0, int(form, `a_${m.id}`)) };
      await tx.attendance.upsert({
        where: { eventId_memberId: { eventId, memberId: m.id } },
        create: { eventId, memberId: m.id, response: data.attended ? "YES" : "NO", ...data },
        update: data,
      });
    }
    await tx.teamEvent.update({
      where: { id: eventId },
      data: { finished: true, cost, scoreFor: sf === "" ? null : Number(sf), scoreAgainst: sa === "" ? null : Number(sa), chargesIssued: event.chargesIssued || split },
    });
    if (split) {
      const note = `${event.title} ${formatDateTime(event.start)}`;
      await tx.fundTransaction.createMany({
        data: attended.map((m) => ({ teamId, kind: "CHARGE", category: "MATCH", memberId: m.id, amount: share, note, eventId, createdById: user.id, date: event.start })),
      });
      await tx.fundTransaction.create({ data: { teamId, kind: "EXPENSE", category: "PITCH", amount: cost, note, eventId, createdById: user.id, date: event.start } });
    }
  });
  if (split) await audit(teamId, user.name, "Chia tiền trận", `${event.title}: ${formatVND(cost)} / ${attended.length} người = ${formatVND(share)}/người`);
  done(back, split ? `Đã chốt buổi đá, mỗi người ${formatVND(share)}` : "Đã chốt buổi đá");
}

export async function deleteEventAction(teamId: string, eventId: string) {
  const user = await requireUser("/doi");
  const team = await teamOf(teamId);
  const back = `/doi/${team.slug}/lich`;
  await requireTeamRole(teamId, user.id, "fund", back);
  const event = await db.teamEvent.findFirst({ where: { id: eventId, teamId } });
  if (!event) fail(back, "Không tìm thấy buổi đá");
  if (event.chargesIssued) fail(back, "Buổi đá đã chia tiền, không xóa được. Hãy xóa từng giao dịch trong Quỹ nếu cần.");
  await db.teamEvent.delete({ where: { id: eventId } });
  done(back, "Đã xóa buổi đá");
}
