"use server";
import { redirect } from "next/navigation";
import { db } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { bool, done, fail, int, str } from "@/lib/server/flash";
import { notify } from "@/lib/server/notify";
import { COST_SPLIT, LEVELS, PITCH_SIZES, REPORT_REASONS, isKey } from "@/lib/domain/constants";
import { isValidLocation } from "@/lib/domain/locations";
import { containsBettingTerms } from "@/lib/domain/moderation";
import { formatDateTime, fromVN, hhmmToMinutes, isDateKey } from "@/lib/domain/time";

const BETTING_MSG = "ChonSan không cho phép kèo có cược/độ. Vui lòng bỏ nội dung đó (chia tiền sân thì được).";

function when(form: FormData, back: string) {
  const date = str(form, "date"), time = str(form, "time");
  if (!isDateKey(date) || !time) fail(back, "Chọn ngày giờ");
  const start = fromVN(date, hhmmToMinutes(time));
  if (start <= new Date()) fail(back, "Thời gian phải ở tương lai");
  return start;
}

/** Tên đội người dùng tự gõ (không có quản lý đội) */
function teamNameFrom(form: FormData, back: string) {
  const name = str(form, "teamName").slice(0, 60);
  if (!name) fail(back, "Nhập tên đội của bạn");
  if (containsBettingTerms(name)) fail(back, BETTING_MSG);
  return name;
}

export async function createMatchPostAction(form: FormData) {
  const back = "/keo/moi";
  const user = await requireUser(back);
  const teamName = teamNameFrom(form, back);
  const province = str(form, "province"), district = str(form, "district");
  if (!isValidLocation(province, district)) fail(back, "Khu vực không hợp lệ");
  const note = str(form, "note").slice(0, 300), venueText = str(form, "venueText").slice(0, 120);
  if (!venueText) fail(back, "Nhập sân (hoặc 'chưa có sân, cần đội có sân')");
  if (containsBettingTerms(`${note} ${venueText}`)) fail(back, BETTING_MSG);
  const size = str(form, "pitchSize"), level = str(form, "level"), split = str(form, "costSplit");
  const post = await db.matchPost.create({
    data: {
      authorId: user.id, teamName, start: when(form, back), venueText, province, district, note,
      pitchSize: isKey(PITCH_SIZES, size) ? size : "7", level: isKey(LEVELS, level) ? level : "TRUNG_BINH",
      costSplit: isKey(COST_SPLIT, split) ? split : "HALF",
    },
  });
  redirect(`/keo/${post.id}?ok=${encodeURIComponent("Đã đăng kèo! Các đội khác sẽ thấy và gửi nhận kèo.")}`);
}

export async function requestMatchAction(postId: string, form: FormData) {
  const back = `/keo/${postId}`;
  const user = await requireUser(back);
  const post = await db.matchPost.findUnique({ where: { id: postId } });
  if (!post || post.status !== "OPEN") fail(back, "Kèo không còn mở");
  if (post.authorId === user.id) fail(back, "Không thể nhận kèo của chính mình");
  const teamName = teamNameFrom(form, back);
  const message = str(form, "message").slice(0, 300);
  if (containsBettingTerms(message)) fail(back, BETTING_MSG);
  await db.matchRequest.upsert({
    where: { postId_userId: { postId, userId: user.id } },
    create: { postId, userId: user.id, teamName, message },
    update: { teamName, message, status: "PENDING" },
  });
  await notify(post.authorId, `${teamName} muốn nhận kèo của bạn`, formatDateTime(post.start), back);
  done(back, "Đã gửi nhận kèo, chờ chủ kèo chọn");
}

export async function acceptMatchAction(postId: string, requestId: string) {
  const back = `/keo/${postId}`;
  const user = await requireUser(back);
  const post = await db.matchPost.findUnique({ where: { id: postId } });
  if (!post || post.status !== "OPEN") fail(back, "Kèo không còn mở");
  if (post.authorId !== user.id) fail(back, "Chỉ người đăng kèo được chốt");
  const req = await db.matchRequest.findFirst({ where: { id: requestId, postId } });
  if (!req) fail(back, "Không tìm thấy yêu cầu");
  await db.$transaction([
    db.matchRequest.update({ where: { id: req.id }, data: { status: "ACCEPTED" } }),
    db.matchRequest.updateMany({ where: { postId, id: { not: req.id } }, data: { status: "REJECTED" } }),
    db.matchPost.update({ where: { id: postId }, data: { status: "MATCHED" } }),
  ]);
  await notify(req.userId, `${post.teamName} đã chốt kèo với đội bạn!`, `${formatDateTime(post.start)} · ${post.venueText}`, back);
  done(back, `Đã chốt kèo với ${req.teamName}. Hai bên đã thấy SĐT của nhau.`);
}

export async function cancelMatchPostAction(postId: string) {
  const back = `/keo/${postId}`;
  const user = await requireUser(back);
  const post = await db.matchPost.findUnique({ where: { id: postId } });
  if (!post) fail("/keo", "Không tìm thấy kèo");
  if (post.authorId !== user.id) fail(back, "Chỉ người đăng kèo được hủy");
  await db.matchPost.update({ where: { id: postId }, data: { status: "CANCELLED" } });
  done("/keo", "Đã hủy kèo");
}

/** Đánh giá bên đối diện sau khi đá (hoặc báo bùng kèo) */
export async function rateMatchAction(postId: string, form: FormData) {
  const back = `/keo/${postId}`;
  const user = await requireUser(back);
  const post = await db.matchPost.findUnique({ where: { id: postId }, include: { requests: { where: { status: "ACCEPTED" } } } });
  if (!post || post.status !== "MATCHED" || !post.requests[0]) fail(back, "Kèo chưa được chốt");
  if (post.start > new Date()) fail(back, "Chỉ đánh giá được sau giờ đá");
  const guestId = post.requests[0].userId;
  if (![post.authorId, guestId].includes(user.id)) fail(back, "Bạn không tham gia kèo này");
  const toUserId = user.id === post.authorId ? guestId : post.authorId;
  const clamp = (k: string) => Math.min(5, Math.max(1, int(form, k, 5)));
  const data = { punctual: clamp("punctual"), fairplay: clamp("fairplay"), levelMatch: clamp("levelMatch"), noShow: bool(form, "noShow"), comment: str(form, "comment").slice(0, 300) };
  await db.matchRating.upsert({
    where: { matchPostId_fromUserId: { matchPostId: postId, fromUserId: user.id } },
    create: { matchPostId: postId, fromUserId: user.id, toUserId, ...data },
    update: data,
  });
  done(back, "Cảm ơn! Đánh giá giúp cộng đồng biết ai uy tín.");
}

export async function createPlayerPostAction(form: FormData) {
  const back = "/keo/nguoi/moi";
  const user = await requireUser(back);
  const province = str(form, "province"), district = str(form, "district");
  if (!isValidLocation(province, district)) fail(back, "Khu vực không hợp lệ");
  const teamName = str(form, "teamName").slice(0, 60);
  const note = str(form, "note").slice(0, 300), venueText = str(form, "venueText").slice(0, 120);
  if (!venueText) fail(back, "Nhập sân");
  if (containsBettingTerms(`${teamName} ${note} ${venueText}`)) fail(back, BETTING_MSG);
  const needed = int(form, "needed");
  if (needed < 1 || needed > 15) fail(back, "Số người cần từ 1 đến 15");
  const level = str(form, "level");
  const post = await db.playerPost.create({
    data: {
      authorId: user.id, teamName, start: when(form, back), venueText, province, district, needed, note,
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
  const message = str(form, "message").slice(0, 200);
  if (containsBettingTerms(message)) fail(back, BETTING_MSG);
  await db.playerRequest.upsert({
    where: { postId_userId: { postId, userId: user.id } },
    create: { postId, userId: user.id, message },
    update: { message, status: "PENDING" },
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
