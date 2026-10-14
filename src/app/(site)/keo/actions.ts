"use server";
import { redirect } from "next/navigation";
import { db } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { canManageFund } from "@/lib/server/permissions";
import { bool, done, fail, int, str } from "@/lib/server/flash";
import { notify } from "@/lib/server/notify";
import { COST_SPLIT, LEVELS, PITCH_SIZES, REPORT_REASONS, isKey } from "@/lib/domain/constants";
import { isValidLocation } from "@/lib/domain/locations";
import { containsBettingTerms } from "@/lib/domain/moderation";
import { formatDateTime, fromVN, hhmmToMinutes, isDateKey } from "@/lib/domain/time";

const BETTING_MSG = "ChọnSân không cho phép kèo có cược/độ. Vui lòng bỏ nội dung đó (chia tiền sân thì được).";

async function managedTeam(userId: string, teamId: string, back: string) {
  const m = await db.teamMember.findFirst({ where: { teamId, userId, active: true }, include: { team: true } });
  if (!m || !canManageFund(m.role)) fail(back, "Chỉ đội trưởng hoặc thủ quỹ được đăng / nhận kèo cho đội");
  return m.team;
}

async function notifyManagers(teamId: string, title: string, body: string, link: string) {
  const ms = await db.teamMember.findMany({ where: { teamId, active: true, role: { in: ["CAPTAIN", "TREASURER"] } } });
  for (const m of ms) await notify(m.userId, title, body, link);
}

function when(form: FormData, back: string) {
  const date = str(form, "date"), time = str(form, "time");
  if (!isDateKey(date) || !time) fail(back, "Chọn ngày giờ");
  const start = fromVN(date, hhmmToMinutes(time));
  if (start <= new Date()) fail(back, "Thời gian phải ở tương lai");
  return start;
}

export async function createMatchPostAction(form: FormData) {
  const back = "/keo/moi";
  const user = await requireUser(back);
  const team = await managedTeam(user.id, str(form, "teamId"), back);
  const province = str(form, "province"), district = str(form, "district");
  if (!isValidLocation(province, district)) fail(back, "Khu vực không hợp lệ");
  const note = str(form, "note").slice(0, 300), venueText = str(form, "venueText").slice(0, 120);
  if (!venueText) fail(back, "Nhập sân (hoặc 'chưa có sân, cần đội có sân')");
  if (containsBettingTerms(`${note} ${venueText}`)) fail(back, BETTING_MSG);
  const size = str(form, "pitchSize"), level = str(form, "level"), split = str(form, "costSplit");
  const post = await db.matchPost.create({
    data: {
      teamId: team.id, authorId: user.id, start: when(form, back), venueText, province, district, note,
      pitchSize: isKey(PITCH_SIZES, size) ? size : "7", level: isKey(LEVELS, level) ? level : "TRUNG_BINH",
      costSplit: isKey(COST_SPLIT, split) ? split : "HALF",
    },
  });
  redirect(`/keo/${post.id}?ok=${encodeURIComponent("Đã đăng kèo! Các đội khác sẽ thấy và gửi nhận kèo.")}`);
}

export async function requestMatchAction(postId: string, form: FormData) {
  const back = `/keo/${postId}`;
  const user = await requireUser(back);
  const post = await db.matchPost.findUnique({ where: { id: postId }, include: { team: true } });
  if (!post || post.status !== "OPEN") fail(back, "Kèo không còn mở");
  const team = await managedTeam(user.id, str(form, "teamId"), back);
  if (team.id === post.teamId) fail(back, "Không thể nhận kèo của chính đội mình");
  const message = str(form, "message").slice(0, 300);
  if (containsBettingTerms(message)) fail(back, BETTING_MSG);
  await db.matchRequest.upsert({ where: { postId_teamId: { postId, teamId: team.id } }, create: { postId, teamId: team.id, message }, update: { message, status: "PENDING" } });
  await notifyManagers(post.teamId, `${team.name} muốn nhận kèo của bạn`, formatDateTime(post.start), back);
  done(back, "Đã gửi nhận kèo, chờ đội chủ kèo chọn");
}

export async function acceptMatchAction(postId: string, requestId: string) {
  const back = `/keo/${postId}`;
  const user = await requireUser(back);
  const post = await db.matchPost.findUnique({ where: { id: postId }, include: { team: true } });
  if (!post || post.status !== "OPEN") fail(back, "Kèo không còn mở");
  await managedTeam(user.id, post.teamId, back);
  const req = await db.matchRequest.findFirst({ where: { id: requestId, postId }, include: { team: true } });
  if (!req) fail(back, "Không tìm thấy yêu cầu");
  await db.$transaction([
    db.matchRequest.update({ where: { id: req.id }, data: { status: "ACCEPTED" } }),
    db.matchRequest.updateMany({ where: { postId, id: { not: req.id } }, data: { status: "REJECTED" } }),
    db.matchPost.update({ where: { id: postId }, data: { status: "MATCHED" } }),
    // Tự thêm buổi đá vào lịch của cả hai đội
    db.teamEvent.create({ data: { teamId: post.teamId, title: `Giao hữu vs ${req.team.name}`, start: post.start, venueText: post.venueText, opponent: req.team.name } }),
    db.teamEvent.create({ data: { teamId: req.teamId, title: `Giao hữu vs ${post.team.name}`, start: post.start, venueText: post.venueText, opponent: post.team.name } }),
  ]);
  await notifyManagers(req.teamId, `${post.team.name} đã chốt kèo với đội bạn!`, `${formatDateTime(post.start)} · ${post.venueText}`, back);
  done(back, `Đã chốt kèo với ${req.team.name}. Buổi đá đã được thêm vào lịch hai đội.`);
}

export async function cancelMatchPostAction(postId: string) {
  const back = `/keo/${postId}`;
  const user = await requireUser(back);
  const post = await db.matchPost.findUnique({ where: { id: postId } });
  if (!post) fail("/keo", "Không tìm thấy kèo");
  await managedTeam(user.id, post.teamId, back);
  await db.matchPost.update({ where: { id: postId }, data: { status: "CANCELLED" } });
  done("/keo", "Đã hủy kèo");
}

/** Đánh giá đội đối diện sau khi đá (hoặc báo bùng kèo) */
export async function rateTeamAction(postId: string, form: FormData) {
  const back = `/keo/${postId}`;
  const user = await requireUser(back);
  const post = await db.matchPost.findUnique({ where: { id: postId }, include: { requests: { where: { status: "ACCEPTED" } } } });
  if (!post || post.status !== "MATCHED" || !post.requests[0]) fail(back, "Kèo chưa được chốt");
  if (post.start > new Date()) fail(back, "Chỉ đánh giá được sau giờ đá");
  const fromTeamId = str(form, "fromTeamId");
  await managedTeam(user.id, fromTeamId, back);
  const guestId = post.requests[0].teamId;
  if (![post.teamId, guestId].includes(fromTeamId)) fail(back, "Đội của bạn không tham gia kèo này");
  const toTeamId = fromTeamId === post.teamId ? guestId : post.teamId;
  const clamp = (k: string) => Math.min(5, Math.max(1, int(form, k, 5)));
  const data = { punctual: clamp("punctual"), fairplay: clamp("fairplay"), levelMatch: clamp("levelMatch"), noShow: bool(form, "noShow"), comment: str(form, "comment").slice(0, 300) };
  await db.teamRating.upsert({
    where: { matchPostId_fromTeamId: { matchPostId: postId, fromTeamId } },
    create: { matchPostId: postId, fromTeamId, toTeamId, ...data },
    update: data,
  });
  done(back, "Cảm ơn! Đánh giá giúp cộng đồng biết đội nào uy tín.");
}

export async function createPlayerPostAction(form: FormData) {
  const back = "/keo/nguoi/moi";
  const user = await requireUser(back);
  const province = str(form, "province"), district = str(form, "district");
  if (!isValidLocation(province, district)) fail(back, "Khu vực không hợp lệ");
  const teamId = str(form, "teamId") || null;
  if (teamId && !(await db.teamMember.findFirst({ where: { teamId, userId: user.id, active: true } }))) fail(back, "Bạn không thuộc đội này");
  const note = str(form, "note").slice(0, 300), venueText = str(form, "venueText").slice(0, 120);
  if (!venueText) fail(back, "Nhập sân");
  if (containsBettingTerms(`${note} ${venueText}`)) fail(back, BETTING_MSG);
  const needed = int(form, "needed");
  if (needed < 1 || needed > 15) fail(back, "Số người cần từ 1 đến 15");
  const level = str(form, "level");
  const post = await db.playerPost.create({
    data: {
      authorId: user.id, teamId, start: when(form, back), venueText, province, district, needed, note,
      position: str(form, "position").slice(0, 60), feePerPerson: Math.max(0, int(form, "feePerPerson")),
      level: isKey(LEVELS, level) ? level : "TRUNG_BINH",
    },
  });
  redirect(`/keo/nguoi/${post.id}?ok=${encodeURIComponent("Đã đăng tìm người!")}`);
}

export async function requestJoinAction(postId: string, form: FormData) {
  const back = `/keo/nguoi/${postId}`;
  const user = await requireUser(back);
  const post = await db.playerPost.findUnique({ where: { id: postId } });
  if (!post || post.status !== "OPEN") fail(back, "Bài đã đủ người hoặc đã đóng");
  if (post.authorId === user.id) fail(back, "Đây là bài của bạn");
  await db.playerRequest.upsert({
    where: { postId_userId: { postId, userId: user.id } },
    create: { postId, userId: user.id, message: str(form, "message").slice(0, 200) },
    update: { message: str(form, "message").slice(0, 200), status: "PENDING" },
  });
  await notify(post.authorId, `${user.name} xin vào đá ghép`, formatDateTime(post.start), back);
  done(back, "Đã gửi, chờ người đăng duyệt");
}

export async function decideJoinAction(postId: string, requestId: string, accept: boolean) {
  const back = `/keo/nguoi/${postId}`;
  const user = await requireUser(back);
  const post = await db.playerPost.findUnique({ where: { id: postId } });
  if (!post || post.authorId !== user.id) fail(back, "Bạn không phải người đăng");
  const req = await db.playerRequest.findFirst({ where: { id: requestId, postId } });
  if (!req) fail(back, "Không tìm thấy yêu cầu");
  await db.playerRequest.update({ where: { id: req.id }, data: { status: accept ? "ACCEPTED" : "REJECTED" } });
  const accepted = await db.playerRequest.count({ where: { postId, status: "ACCEPTED" } });
  if (accepted >= post.needed) await db.playerPost.update({ where: { id: postId }, data: { status: "FULL" } });
  await notify(req.userId, accept ? "Bạn đã được nhận vào đá ghép ✅" : "Rất tiếc, bài đá ghép đã đủ người", `${formatDateTime(post.start)} · ${post.venueText}`, back);
  done(back, accept ? "Đã nhận" : "Đã từ chối");
}

export async function closePlayerPostAction(postId: string) {
  const back = `/keo/nguoi/${postId}`;
  const user = await requireUser(back);
  const post = await db.playerPost.findUnique({ where: { id: postId } });
  if (!post || post.authorId !== user.id) fail(back, "Bạn không phải người đăng");
  await db.playerPost.update({ where: { id: postId }, data: { status: "CANCELLED" } });
  done("/keo?tab=nguoi", "Đã đóng bài");
}

export async function reportAction(targetType: string, targetId: string, back: string, form: FormData) {
  const user = await requireUser(back);
  const reason = str(form, "reason");
  await db.report.create({ data: { reporterId: user.id, targetType, targetId, reason: isKey(REPORT_REASONS, reason) ? reason : "OTHER", detail: str(form, "detail").slice(0, 500) } });
  done(back, "Đã gửi báo cáo tới quản trị viên");
}
