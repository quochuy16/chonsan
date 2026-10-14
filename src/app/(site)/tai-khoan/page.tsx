import Link from "next/link";
import { db } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { completePastBookings } from "@/lib/server/booking";
import { LEVELS } from "@/lib/domain/constants";
import { formatVND } from "@/lib/domain/money";
import { formatDateShort, formatTime } from "@/lib/domain/time";
import { Flash } from "@/components/flash";
import { LocationSelect } from "@/components/location-select";
import { SubmitButton } from "@/components/submit-button";
import { BookingStatusBadge, Empty } from "@/components/ui";
import { deleteAccountAction, unlinkGoogleAction, updateProfileAction } from "./actions";
import { isGoogleEnabled } from "@/lib/server/google";

export const metadata = { title: "Tài khoản" };

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser("/tai-khoan");
  await completePastBookings();
  const now = new Date();
  const [upcoming, past] = await Promise.all([
    db.booking.findMany({ where: { userId: user.id, end: { gte: now } }, include: { pitch: { include: { venue: true } } }, orderBy: { start: "asc" }, take: 30 }),
    db.booking.findMany({ where: { userId: user.id, end: { lt: now } }, include: { pitch: { include: { venue: true } }, review: true }, orderBy: { start: "desc" }, take: 20 }),
  ]);
  const Row = ({ b }: { b: (typeof upcoming)[number] & { review?: unknown } }) => (
    <Link href={`/dat-san/${b.code}`} className="flex items-center justify-between gap-3 py-3 hover:bg-gray-50">
      <div className="min-w-0">
        <p className="truncate font-semibold">{b.pitch.venue.name} · {b.pitch.name}</p>
        <p className="muted">{formatTime(b.start)}–{formatTime(b.end)}, {formatDateShort(b.start)} · {formatVND(b.totalPrice)}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <BookingStatusBadge status={b.status} />
        {b.status === "COMPLETED" && "review" in b && !b.review && <span className="text-xs text-amber-600">Chưa đánh giá</span>}
      </div>
    </Link>
  );
  return (
    <div className="container-page py-8">
      <h1 className="h1 mb-4">Xin chào, {user.name}</h1>
      <Flash searchParams={sp} />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <section className="card">
            <h2 className="h2 mb-2">Lịch sắp tới</h2>
            {upcoming.length === 0 ? <Empty title="Chưa có lịch đặt sân" action={{ href: "/san", label: "Tìm sân ngay" }} /> :
              <div className="divide-y divide-gray-100">{upcoming.map((b) => <Row key={b.id} b={b} />)}</div>}
          </section>
          <section className="card">
            <h2 className="h2 mb-2">Đã đá</h2>
            {past.length === 0 ? <p className="muted">Chưa có.</p> : <div className="divide-y divide-gray-100">{past.map((b) => <Row key={b.id} b={b} />)}</div>}
          </section>
        </div>
        <aside className="space-y-5">
          <form action={updateProfileAction} className="card space-y-3">
            <h2 className="h2">Hồ sơ</h2>
            <div><label className="label" htmlFor="name">Họ tên</label><input id="name" name="name" defaultValue={user.name} className="input" required /></div>
            <div><label className="label" htmlFor="phone">Số điện thoại</label><input id="phone" name="phone" defaultValue={user.phone} className="input" required /></div>
            <p className="text-xs text-gray-500">Email: {user.email}</p>
            <LocationSelect province={user.province ?? ""} district={user.district ?? ""} allowAll />
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label" htmlFor="skillLevel">Trình độ</label>
                <select id="skillLevel" name="skillLevel" defaultValue={user.skillLevel ?? ""} className="input"><option value="">—</option>
                  {Object.entries(LEVELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              <div><label className="label" htmlFor="position">Vị trí</label><input id="position" name="position" defaultValue={user.position ?? ""} className="input" placeholder="Tiền đạo, thủ môn…" /></div>
            </div>
            <SubmitButton>Lưu</SubmitButton>
          </form>
          {(user.googleId || isGoogleEnabled()) && (
            <section className="card text-sm">
              <h2 className="h2 mb-2">Đăng nhập Google</h2>
              {user.googleId ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-brand-700">✔ Đã liên kết</span>
                  {user.passwordHash ? (
                    <form action={unlinkGoogleAction}><SubmitButton className="btn-ghost btn-sm" confirm="Bỏ liên kết Google? Bạn sẽ đăng nhập bằng email + mật khẩu.">Bỏ liên kết</SubmitButton></form>
                  ) : <span className="text-xs text-gray-500">Tài khoản chỉ dùng Google để đăng nhập</span>}
                </div>
              ) : (
                <a href="/auth/google?link=1&next=/tai-khoan" className="btn-secondary w-full">Liên kết tài khoản Google</a>
              )}
            </section>
          )}
          <details className="card text-sm">
            <summary className="cursor-pointer text-gray-500">Xóa tài khoản</summary>
            <form action={deleteAccountAction} className="mt-3 space-y-2">
              <p className="text-gray-600">Dữ liệu cá nhân (tên, email, SĐT) sẽ bị xóa. Lịch sử đặt sân và bài kèo vẫn giữ dưới tên ẩn danh.</p>
              <input name="confirm" className="input" placeholder='Gõ "XOA" để xác nhận' />
              <SubmitButton className="btn-danger" confirm="Xóa vĩnh viễn tài khoản?">Xóa tài khoản</SubmitButton>
            </form>
          </details>
        </aside>
      </div>
    </div>
  );
}
