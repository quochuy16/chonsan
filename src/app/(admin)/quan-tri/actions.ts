"use server";
import { redirect } from "next/navigation";
import { db } from "@/lib/server/db";
import { ADMIN_LOGIN, createSession, destroySession, requireAdmin, verifyPassword } from "@/lib/server/auth";
import { done, fail, str } from "@/lib/server/flash";
import { notify } from "@/lib/server/notify";
import { canTransition } from "@/lib/domain/schedule";
import { formatDateTime } from "@/lib/domain/time";

/** Trang để quay lại sau thao tác — chỉ chấp nhận đường dẫn trong khu quản trị */
function backFrom(form: FormData, fallback = "/quan-tri"): string {
  const b = str(form, "back");
  return b.startsWith("/quan-tri") && !b.startsWith("//") ? b : fallback;
}

export async function adminLoginAction(form: FormData) {
  const email = str(form, "email").toLowerCase();
  const rawNext = str(form, "next");
  const next = rawNext.startsWith("/quan-tri") ? rawNext : "/quan-tri";
  const user = await db.user.findUnique({ where: { email } });
  const ok = user && !user.banned && (await verifyPassword(str(form, "password"), user.passwordHash));
  if (!ok) fail(ADMIN_LOGIN, "Email hoặc mật khẩu không đúng");
  if (user.role !== "ADMIN") fail(ADMIN_LOGIN, "Tài khoản này không có quyền quản trị");
  await createSession(user.id);
  redirect(next);
}

export async function adminLogoutAction() {
  await destroySession();
  redirect(ADMIN_LOGIN);
}

// ---- Sân ----
export async function setVenueStatusAction(venueId: string, status: "APPROVED" | "REJECTED", form: FormData) {
  await requireAdmin();
  const back = backFrom(form, "/quan-tri/san");
  const v = await db.venue.update({ where: { id: venueId }, data: { status } });
  await notify(v.ownerId, status === "APPROVED" ? `${v.name} đã được duyệt ✅` : `${v.name} chưa được duyệt / đã bị ẩn`,
    status === "APPROVED" ? "Sân đã hiển thị công khai và nhận đặt online." : "Vui lòng kiểm tra lại thông tin sân hoặc liên hệ quản trị viên.", `/chu-san/${v.id}`);
  done(back, status === "APPROVED" ? `Đã duyệt ${v.name}` : `Đã từ chối / ẩn ${v.name}`);
}

export async function toggleVerifiedAction(venueId: string, form: FormData) {
  await requireAdmin();
  const v = await db.venue.findUniqueOrThrow({ where: { id: venueId } });
  await db.venue.update({ where: { id: venueId }, data: { verified: !v.verified } });
  done(backFrom(form, "/quan-tri/san"), v.verified ? `Đã bỏ xác minh ${v.name}` : `Đã xác minh ${v.name}`);
}

/** Gói thu phí: chủ sân chuyển khoản thủ công rồi quản trị viên bật Pro */
export async function setPlanAction(venueId: string, plan: "FREE" | "PRO", form: FormData) {
  await requireAdmin();
  const v = await db.venue.update({ where: { id: venueId }, data: { plan } });
  await notify(v.ownerId, plan === "PRO" ? `${v.name} đã lên gói Pro` : `${v.name} đã về gói Miễn phí`, "", `/chu-san/${v.id}`);
  done(backFrom(form, "/quan-tri/san"), `${v.name}: gói ${plan === "PRO" ? "Pro" : "Miễn phí"}`);
}

// ---- Người dùng ----
export async function setUserBannedAction(userId: string, banned: boolean, form: FormData) {
  const admin = await requireAdmin();
  const back = backFrom(form, "/quan-tri/nguoi-dung");
  if (userId === admin.id) fail(back, "Không thể tự khóa tài khoản của mình");
  const u = await db.user.update({ where: { id: userId }, data: { banned } });
  done(back, banned ? `Đã khóa ${u.name}` : `Đã mở khóa ${u.name}`);
}

export async function setUserRoleAction(userId: string, role: "USER" | "ADMIN", form: FormData) {
  const admin = await requireAdmin();
  const back = backFrom(form, "/quan-tri/nguoi-dung");
  if (userId === admin.id) fail(back, "Không thể tự đổi quyền của chính mình");
  const u = await db.user.update({ where: { id: userId }, data: { role } });
  done(back, role === "ADMIN" ? `${u.name} giờ là quản trị viên` : `${u.name} giờ là người dùng thường`);
}

// ---- Đơn đặt sân ----
export async function adminCancelBookingAction(bookingId: string, form: FormData) {
  await requireAdmin();
  const back = backFrom(form, "/quan-tri/dat-san");
  const b = await db.booking.findUnique({ where: { id: bookingId }, include: { pitch: { include: { venue: true } } } });
  if (!b) fail(back, "Không tìm thấy đơn");
  if (!canTransition(b.status, "CANCELLED")) fail(back, "Đơn này không thể hủy");
  await db.booking.update({ where: { id: b.id }, data: { status: "CANCELLED", cancelledAt: new Date() } });
  const msg = `${b.pitch.venue.name} · ${b.pitch.name} · ${formatDateTime(b.start)}`;
  await notify(b.userId, "Đơn đặt sân đã bị quản trị viên hủy", msg, `/dat-san/${b.code}`);
  await notify(b.pitch.venue.ownerId, "Quản trị viên đã hủy một đơn đặt sân", `${b.customerName} · ${msg}`, `/chu-san/${b.pitch.venueId}`);
  done(back, `Đã hủy đơn ${b.code}`);
}

// ---- Đội & kèo ----
export async function toggleTeamPublicAction(teamId: string, form: FormData) {
  await requireAdmin();
  const t = await db.team.findUniqueOrThrow({ where: { id: teamId } });
  await db.team.update({ where: { id: teamId }, data: { isPublic: !t.isPublic } });
  done(backFrom(form, "/quan-tri/doi"), t.isPublic ? `Đã ẩn trang công khai của ${t.name}` : `Đã hiện lại ${t.name}`);
}

export async function setPostHiddenAction(kind: "MATCH" | "PLAYER", postId: string, hidden: boolean, form: FormData) {
  await requireAdmin();
  const back = backFrom(form, "/quan-tri/keo");
  const restore = (start: Date) => (start > new Date() ? "OPEN" : "CANCELLED");
  if (kind === "MATCH") {
    const p = await db.matchPost.findUniqueOrThrow({ where: { id: postId } });
    await db.matchPost.update({ where: { id: postId }, data: { status: hidden ? "HIDDEN" : restore(p.start) } });
    if (hidden) await notify(p.authorId, "Bài kèo của bạn đã bị ẩn", "Bài vi phạm quy định cộng đồng ChọnSân (vd: cá cược).", "/keo");
  } else {
    const p = await db.playerPost.findUniqueOrThrow({ where: { id: postId } });
    await db.playerPost.update({ where: { id: postId }, data: { status: hidden ? "HIDDEN" : restore(p.start) } });
    if (hidden) await notify(p.authorId, "Bài tìm người của bạn đã bị ẩn", "Bài vi phạm quy định cộng đồng ChọnSân.", "/keo?tab=nguoi");
  }
  done(back, hidden ? "Đã ẩn bài" : "Đã hiện lại bài");
}

// ---- Báo cáo vi phạm ----
export async function resolveReportAction(reportId: string, action: "DISMISS" | "HIDE" | "BAN", form: FormData) {
  const admin = await requireAdmin();
  const back = backFrom(form, "/quan-tri/bao-cao");
  const r = await db.report.findUnique({ where: { id: reportId } });
  if (!r) fail(back, "Không tìm thấy báo cáo");
  if (action === "HIDE") {
    if (r.targetType === "MATCH_POST") await db.matchPost.update({ where: { id: r.targetId }, data: { status: "HIDDEN" } });
    else if (r.targetType === "PLAYER_POST") await db.playerPost.update({ where: { id: r.targetId }, data: { status: "HIDDEN" } });
    else if (r.targetType === "VENUE") await db.venue.update({ where: { id: r.targetId }, data: { status: "REJECTED" } });
    else if (r.targetType === "TEAM") await db.team.update({ where: { id: r.targetId }, data: { isPublic: false } });
  }
  if (action === "BAN") {
    const authorId =
      r.targetType === "USER" ? r.targetId
      : r.targetType === "MATCH_POST" ? (await db.matchPost.findUnique({ where: { id: r.targetId } }))?.authorId
      : r.targetType === "PLAYER_POST" ? (await db.playerPost.findUnique({ where: { id: r.targetId } }))?.authorId
      : r.targetType === "VENUE" ? (await db.venue.findUnique({ where: { id: r.targetId } }))?.ownerId
      : undefined;
    if (!authorId || authorId === admin.id) fail(back, "Không xác định được tài khoản để khóa");
    await db.user.update({ where: { id: authorId }, data: { banned: true } });
  }
  await db.report.update({ where: { id: reportId }, data: { status: action === "DISMISS" ? "DISMISSED" : "RESOLVED" } });
  done(back, action === "DISMISS" ? "Đã bỏ qua báo cáo" : action === "HIDE" ? "Đã ẩn nội dung bị báo cáo" : "Đã khóa tài khoản vi phạm");
}
