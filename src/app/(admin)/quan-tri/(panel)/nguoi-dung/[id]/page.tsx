import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/server/db";
import { requireAdmin } from "@/lib/server/auth";
import { Flash } from "@/components/flash";
import { BookingStatusBadge } from "@/components/ui";
import { LEVELS, label } from "@/lib/domain/constants";
import { computeReputation } from "@/lib/domain/reputation";
import { formatVND } from "@/lib/domain/money";
import { formatDateTime, vnDateKey } from "@/lib/domain/time";
import { ActionButton } from "../../../_components/admin-form";
import { PageHeader, Panel, Pill, btnDanger, btnLight } from "../../../_components/ui";
import { setUserBannedAction, setUserRoleAction } from "../../../actions";

export const metadata = { title: "Chi tiết người dùng" };

export default async function UserDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { id } = await params;
  const admin = await requireAdmin(`/quan-tri/nguoi-dung/${id}`);
  const sp = await searchParams;
  const u = await db.user.findUnique({
    where: { id },
    include: {
      venues: { select: { id: true, name: true, status: true, plan: true } },
      ratingsReceived: true,
      bookings: { orderBy: { start: "desc" }, take: 15, include: { pitch: { include: { venue: { select: { name: true } } } } } },
    },
  });
  if (!u) notFound();
  const rep = computeReputation(u.ratingsReceived);
  const [stats, reportsAgainst] = await Promise.all([
    db.booking.groupBy({ by: ["status"], where: { userId: id }, _count: true }),
    db.report.count({ where: { targetType: "USER", targetId: id } }),
  ]);
  const count = (s: string) => stats.find((x) => x.status === s)?._count ?? 0;
  const back = `/quan-tri/nguoi-dung/${id}`;
  const self = u.id === admin.id;
  return (
    <>
      <Link href="/quan-tri/nguoi-dung" className="text-sm text-slate-500 hover:underline">← Người dùng</Link>
      <PageHeader title={u.name} desc={u.email}>
        {!self && (
          <div className="flex flex-wrap gap-2">
            {u.role === "ADMIN"
              ? <ActionButton action={setUserRoleAction.bind(null, u.id, "USER")} back={back} label="Bỏ quyền quản trị" className={btnLight} confirm={`Bỏ quyền quản trị của ${u.name}?`} />
              : <ActionButton action={setUserRoleAction.bind(null, u.id, "ADMIN")} back={back} label="Cấp quyền quản trị" className={btnLight} confirm={`Cho ${u.name} toàn quyền quản trị?`} />}
            {u.banned
              ? <ActionButton action={setUserBannedAction.bind(null, u.id, false)} back={back} label="Mở khóa" className={btnLight} />
              : <ActionButton action={setUserBannedAction.bind(null, u.id, true)} back={back} label="Khóa tài khoản" className={btnDanger} confirm={`Khóa tài khoản ${u.name}?`} />}
          </div>
        )}
      </PageHeader>
      <Flash searchParams={sp} />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Panel title="Thông tin">
          <dl className="grid grid-cols-3 gap-y-2 text-sm">
            <dt className="text-slate-500">SĐT</dt><dd className="col-span-2">{u.phone || "—"}</dd>
            <dt className="text-slate-500">Vai trò</dt><dd className="col-span-2">{u.role === "ADMIN" ? <Pill tone="amber">Quản trị viên</Pill> : "Người dùng"}</dd>
            <dt className="text-slate-500">Trạng thái</dt><dd className="col-span-2">{u.banned ? <Pill tone="red">Bị khóa</Pill> : <Pill tone="green">Hoạt động</Pill>}</dd>
            <dt className="text-slate-500">Đăng nhập</dt><dd className="col-span-2">{u.googleId ? "Google " : ""}{u.passwordHash ? "· Mật khẩu" : ""}</dd>
            <dt className="text-slate-500">Khu vực</dt><dd className="col-span-2">{[u.district, u.province].filter(Boolean).join(", ") || "—"}</dd>
            <dt className="text-slate-500">Trình độ</dt><dd className="col-span-2">{label(LEVELS, u.skillLevel) || "—"} {u.position && `· ${u.position}`}</dd>
            <dt className="text-slate-500">Ngày tạo</dt><dd className="col-span-2">{vnDateKey(u.createdAt)}</dd>
            <dt className="text-slate-500">Bị báo cáo</dt><dd className="col-span-2">{reportsAgainst} lần</dd>
          </dl>
        </Panel>
        <Panel title="Đặt sân">
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-slate-500">Đã đá</dt><dd>{count("COMPLETED")}</dd>
            <dt className="text-slate-500">Sắp tới / chờ</dt><dd>{count("CONFIRMED") + count("PENDING")}</dd>
            <dt className="text-slate-500">Đã hủy</dt><dd>{count("CANCELLED")}</dd>
            <dt className="text-slate-500">Bùng</dt><dd className={count("NO_SHOW") ? "font-semibold text-red-600" : ""}>{count("NO_SHOW")}</dd>
          </dl>
        </Panel>
        <Panel title="Sân & uy tín kèo">
          <p className="mb-1 text-xs font-semibold text-slate-500 uppercase">Sân sở hữu</p>
          {u.venues.length === 0 ? <p className="mb-3 text-sm text-slate-400">Không có</p> : <ul className="mb-3 space-y-1 text-sm">{u.venues.map((v) => <li key={v.id}>{v.name} <Pill>{v.status}</Pill> {v.plan === "PRO" && <Pill tone="blue">Pro</Pill>}</li>)}</ul>}
          <p className="mb-1 text-xs font-semibold text-slate-500 uppercase">Uy tín kèo</p>
          {rep.count === 0 ? <p className="text-sm text-slate-400">Chưa có đánh giá</p> : <p className="text-sm">{rep.score}/5 · {rep.count} đánh giá{rep.noShows > 0 && <> · <span className="font-semibold text-red-600">{rep.noShows} lần bùng</span></>}</p>}
        </Panel>
      </div>
      <div className="mt-5">
        <Panel title="15 đơn đặt gần nhất">
          {u.bookings.length === 0 ? <p className="text-sm text-slate-500">Chưa có.</p> : (
            <ul className="divide-y divide-slate-100 text-sm">
              {u.bookings.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span><span className="font-mono text-xs text-slate-500">{b.code}</span> · {b.pitch.venue.name} · {b.pitch.name} · {formatDateTime(b.start)}</span>
                  <span className="flex items-center gap-2">{formatVND(b.totalPrice)} <BookingStatusBadge status={b.status} /></span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
