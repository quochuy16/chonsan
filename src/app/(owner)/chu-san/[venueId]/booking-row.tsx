import Link from "next/link";
import type { Booking, Pitch } from "@prisma/client";
import { formatVND } from "@/lib/domain/money";
import { formatDateShort, formatTime } from "@/lib/domain/time";
import { BookingStatusBadge } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { setBookingStatusAction, toggleDepositAction } from "../booking-actions";

export function BookingRow({ b, venueId, back, showDate }: { b: Booking & { pitch: Pitch }; venueId: string; back: string; showDate?: boolean }) {
  const act = (to: "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW") => setBookingStatusAction.bind(null, venueId, b.id, to);
  const isFuture = b.start > new Date();
  return (
    <li id={`b-${b.id}`} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-semibold">
          {formatTime(b.start)}–{formatTime(b.end)} {showDate && <span className="font-normal text-gray-500">{formatDateShort(b.start)}</span>} · {b.pitch.name}{" "}
          <BookingStatusBadge status={b.status} />
          {b.recurringId && <span className="ml-1 text-xs text-sky-700">↻ cố định</span>}
        </p>
        {b.status === "BLOCKED" ? <p className="muted">{b.customerName}</p> : (
          <p className="muted">
            {b.customerName} · <a className="text-brand-700" href={`tel:${b.customerPhone}`}>{b.customerPhone}</a> · {formatVND(b.totalPrice)}
            {b.depositAmount > 0 && <> · cọc {formatVND(b.depositAmount)} {b.depositPaid ? "✅" : "⏳"}</>}
            {b.source === "MANUAL" && " · đơn tay"} · <Link href={`/dat-san/${b.code}`} className="font-mono">{b.code}</Link>
          </p>
        )}
        {b.note && <p className="text-xs text-gray-500">“{b.note}”</p>}
      </div>
      <div className="flex flex-wrap gap-1">
        {b.status === "PENDING" && <form action={act("CONFIRMED")}><input type="hidden" name="back" value={back} /><SubmitButton className="btn-primary btn-sm">Xác nhận</SubmitButton></form>}
        {b.depositAmount > 0 && ["PENDING", "CONFIRMED"].includes(b.status) && (
          <form action={toggleDepositAction.bind(null, venueId, b.id)}><input type="hidden" name="back" value={back} /><SubmitButton className="btn-secondary btn-sm">{b.depositPaid ? "Bỏ nhận cọc" : "Đã nhận cọc"}</SubmitButton></form>
        )}
        {b.status === "CONFIRMED" && !isFuture && <>
          <form action={act("COMPLETED")}><input type="hidden" name="back" value={back} /><SubmitButton className="btn-secondary btn-sm">Đá xong</SubmitButton></form>
          <form action={act("NO_SHOW")}><input type="hidden" name="back" value={back} /><SubmitButton className="btn-danger btn-sm" confirm="Đánh dấu khách bùng?">Bùng</SubmitButton></form>
        </>}
        {["PENDING", "CONFIRMED", "BLOCKED"].includes(b.status) && (
          <form action={act("CANCELLED")}><input type="hidden" name="back" value={back} /><SubmitButton className="btn-ghost btn-sm text-red-600" confirm="Hủy đơn này?">{b.status === "BLOCKED" ? "Mở khóa" : "Hủy"}</SubmitButton></form>
        )}
      </div>
    </li>
  );
}
