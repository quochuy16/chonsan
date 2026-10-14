import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { completePastBookings } from "@/lib/server/booking";
import { formatVND } from "@/lib/domain/money";
import { canCustomerCancel } from "@/lib/domain/schedule";
import { formatDateLong, formatTime } from "@/lib/domain/time";
import { Flash } from "@/components/flash";
import { BookingStatusBadge } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { VietQR } from "@/components/vietqr";
import { cancelMyBookingAction, reviewAction } from "./actions";

export const metadata = { title: "Chi tiết đặt sân" };

export default async function BookingPage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { code } = await params;
  const sp = await searchParams;
  const user = await requireUser(`/dat-san/${code}`);
  await completePastBookings();
  const b = await db.booking.findUnique({
    where: { code },
    include: { pitch: { include: { venue: { include: { staff: true } } } }, review: true, team: true },
  });
  if (!b) notFound();
  const venue = b.pitch.venue;
  const isStaff = venue.ownerId === user.id || venue.staff.some((s) => s.userId === user.id) || user.role === "ADMIN";
  if (b.userId !== user.id && !isStaff) notFound();
  const series = b.recurringId ? await db.booking.count({ where: { recurringId: b.recurringId, status: { not: "CANCELLED" } } }) : 0;
  const cancellable = b.userId === user.id && ["PENDING", "CONFIRMED"].includes(b.status) && canCustomerCancel(b.start, venue.cancelHours);

  return (
    <div className="container-page max-w-2xl py-8">
      <Flash searchParams={sp} />
      <div className="card">
        <div className="flex items-start justify-between gap-3">
          <div><p className="muted">Mã đặt sân</p><p className="font-mono text-xl font-bold">{b.code}</p></div>
          <BookingStatusBadge status={b.status} />
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="col-span-2"><dt className="muted">Sân</dt><dd className="font-semibold"><Link className="text-brand-700" href={`/san/${venue.slug}`}>{venue.name}</Link> · {b.pitch.name}</dd><dd className="text-gray-500">{venue.address}, {venue.district}</dd></div>
          <div><dt className="muted">Ngày</dt><dd className="font-semibold">{formatDateLong(b.start)}</dd></div>
          <div><dt className="muted">Giờ</dt><dd className="font-semibold">{formatTime(b.start)} – {formatTime(b.end)}</dd></div>
          <div><dt className="muted">Tổng tiền</dt><dd className="font-bold text-brand-700">{formatVND(b.totalPrice)}</dd></div>
          <div><dt className="muted">Cọc</dt><dd>{b.depositAmount ? `${formatVND(b.depositAmount)} · ${b.depositPaid ? "✅ đã nhận" : "chưa nhận"}` : "Không cần"}</dd></div>
          {b.team && <div><dt className="muted">Đội</dt><dd>{b.team.name}</dd></div>}
          {series > 1 && <div><dt className="muted">Đặt cố định</dt><dd>{series} buổi hằng tuần</dd></div>}
          {b.note && <div className="col-span-2"><dt className="muted">Ghi chú</dt><dd>{b.note}</dd></div>}
          <div className="col-span-2"><dt className="muted">Liên hệ chủ sân</dt><dd><a className="text-brand-700" href={`tel:${venue.phone}`}>{venue.phone}</a></dd></div>
        </dl>
        {b.status === "PENDING" && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Đang chờ chủ sân xác nhận. Bạn sẽ nhận thông báo khi được xác nhận.{venue.pendingExpireMin > 0 && ` Nếu sau ${venue.pendingExpireMin} phút chưa được xác nhận, đơn tự hủy để bạn đặt sân khác.`}</p>}
      </div>

      {b.depositAmount > 0 && !b.depositPaid && ["PENDING", "CONFIRMED"].includes(b.status) && (
        <div className="card mt-4">
          <h2 className="h2 mb-3">Chuyển khoản cọc</h2>
          <VietQR bankBin={venue.bankBin} account={venue.bankAccount} accountName={venue.bankAccountName} amount={b.depositAmount} note={`Coc ${b.code}`} />
          <p className="mt-3 text-xs text-gray-500">Chủ sân sẽ xác nhận khi nhận được tiền. Ghi đúng nội dung để chủ sân dễ đối chiếu.</p>
        </div>
      )}

      {b.status === "COMPLETED" && b.userId === user.id && !b.review && (
        <form action={reviewAction.bind(null, b.code)} className="card mt-4 space-y-3">
          <h2 className="h2">Đánh giá sân</h2>
          <div className="flex gap-3">
            {[5, 4, 3, 2, 1].map((n) => (
              <label key={n} className="flex items-center gap-1 text-sm"><input type="radio" name="rating" value={n} defaultChecked={n === 5} /> {n}★</label>
            ))}
          </div>
          <textarea name="comment" className="input" rows={3} placeholder="Mặt cỏ, đèn, thái độ phục vụ…" />
          <SubmitButton>Gửi đánh giá</SubmitButton>
        </form>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {cancellable && (
          <form action={cancelMyBookingAction.bind(null, b.code)} className="flex gap-2">
            <SubmitButton className="btn-danger" confirm="Hủy buổi này?">Hủy buổi này</SubmitButton>
            {series > 1 && <SubmitButton className="btn-danger" name="all" value="1" confirm="Hủy buổi này và tất cả buổi sau?">Hủy cả lịch cố định</SubmitButton>}
          </form>
        )}
        <Link href="/tai-khoan" className="btn-secondary">Lịch đặt của tôi</Link>
        {isStaff && <Link href={`/chu-san/${venue.id}`} className="btn-secondary">Về lịch sân</Link>}
      </div>
    </div>
  );
}
