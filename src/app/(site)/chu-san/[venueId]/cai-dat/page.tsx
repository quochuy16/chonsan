import { notFound } from "next/navigation";
import { db } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { getVenueAccess } from "@/lib/server/permissions";
import { DEPOSIT_TYPES, PITCH_SIZES, PLAN_LIMITS, SURFACES, label } from "@/lib/domain/constants";
import { Flash } from "@/components/flash";
import { Badge } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { VenueForm } from "../../venue-form";
import { addPitchAction, linkPitchesAction, togglePitchAction, unlinkPitchAction, updatePolicyAction, updateVenueAction } from "../../venue-actions";
import { addStaffAction, removeStaffAction } from "../../pricing-actions";

export default async function SettingsPage({ params, searchParams }: { params: Promise<{ venueId: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { venueId } = await params;
  const sp = await searchParams;
  const user = await requireUser(`/chu-san/${venueId}/cai-dat`);
  const access = await getVenueAccess(venueId, user);
  if (!access?.isOwner) notFound();
  const venue = await db.venue.findUniqueOrThrow({
    where: { id: venueId },
    include: { pitches: { orderBy: { sortOrder: "asc" }, include: { parentOf: { include: { child: true } } } }, staff: { include: { user: true } } },
  });
  const linked = venue.pitches.filter((p) => p.parentOf.length > 0);
  return (
    <div className="space-y-5">
      <Flash searchParams={sp} />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="card">
          <h2 className="h2 mb-3">Sân con ({venue.pitches.length}{venue.plan === "FREE" ? `/${PLAN_LIMITS.FREE.pitches}` : ""})</h2>
          <ul className="mb-4 divide-y divide-gray-100">
            {venue.pitches.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                <span><strong>{p.name}</strong> · {label(PITCH_SIZES, p.size)} · {label(SURFACES, p.surface)}{p.covered ? " · mái che" : ""} {!p.active && <Badge tone="red">Tạm ẩn</Badge>}</span>
                <form action={togglePitchAction.bind(null, venueId, p.id)}><SubmitButton className="btn-ghost btn-sm">{p.active ? "Tạm ẩn" : "Mở lại"}</SubmitButton></form>
              </li>
            ))}
          </ul>
          <form action={addPitchAction.bind(null, venueId)} className="grid grid-cols-2 gap-2">
            <input name="name" className="input col-span-2" placeholder={`Tên, VD: Sân ${venue.pitches.length + 1}`} aria-label="Tên sân con" />
            <select name="size" className="input" aria-label="Loại sân">{Object.entries(PITCH_SIZES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            <select name="surface" className="input" aria-label="Mặt sân">{Object.entries(SURFACES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="covered" /> Có mái che</label>
            <SubmitButton className="btn-primary">+ Thêm sân con</SubmitButton>
          </form>
        </section>

        <section className="card">
          <h2 className="h2 mb-1">Sân ghép</h2>
          <p className="muted mb-3">VD: Sân 7 ghép từ Sân 1 + Sân 2. Khi có người đặt sân 7, hai sân 5 tự động bị khóa và ngược lại.</p>
          {linked.length > 0 && (
            <ul className="mb-3 space-y-1 text-sm">
              {linked.map((p) => (
                <li key={p.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                  <span><strong>{p.name}</strong> = {p.parentOf.map((l) => l.child.name).join(" + ")}</span>
                  <form action={unlinkPitchAction.bind(null, venueId, p.id)}><SubmitButton className="btn-ghost btn-sm">Bỏ</SubmitButton></form>
                </li>
              ))}
            </ul>
          )}
          {venue.pitches.length >= 3 ? (
            <form action={linkPitchesAction.bind(null, venueId)} className="space-y-2">
              <select name="parentId" className="input" aria-label="Sân lớn">{venue.pitches.map((p) => <option key={p.id} value={p.id}>Sân lớn: {p.name} ({p.size})</option>)}</select>
              <div className="flex flex-wrap gap-3">{venue.pitches.map((p) => <label key={p.id} className="flex items-center gap-1 text-sm"><input type="checkbox" name="childIds" value={p.id} /> {p.name}</label>)}</div>
              <SubmitButton className="btn-secondary">Lưu sân ghép</SubmitButton>
            </form>
          ) : <p className="text-sm text-gray-500">Cần ít nhất 3 sân con để tạo sân ghép.</p>}
        </section>

        <section className="card">
          <h2 className="h2 mb-3">Chính sách đặt sân</h2>
          <form action={updatePolicyAction.bind(null, venueId)} className="space-y-3">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="autoConfirm" defaultChecked={venue.autoConfirm} /> Tự động xác nhận đơn online</label>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="label" htmlFor="depositType">Cọc</label>
                <select id="depositType" name="depositType" defaultValue={venue.depositType} className="input">{Object.entries(DEPOSIT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              <div><label className="label" htmlFor="depositValue">Mức cọc (đ hoặc %)</label><input id="depositValue" name="depositValue" defaultValue={venue.depositValue} className="input" inputMode="numeric" /></div>
            </div>
            <div><label className="label" htmlFor="cancelHours">Khách được tự hủy trước (giờ)</label><input id="cancelHours" name="cancelHours" type="number" min={0} max={72} defaultValue={venue.cancelHours} className="input" /></div>
            <div><label className="label" htmlFor="pendingExpireMin">Đơn chờ tự hủy nếu chưa xác nhận sau (phút, 0 = không)</label><input id="pendingExpireMin" name="pendingExpireMin" type="number" min={0} max={1440} step={15} defaultValue={venue.pendingExpireMin} className="input" /></div>
            <SubmitButton>Lưu chính sách</SubmitButton>
          </form>
        </section>

        <section className="card">
          <h2 className="h2 mb-1">Nhân viên {venue.plan !== "PRO" && <Badge tone="blue">Pro</Badge>}</h2>
          <p className="muted mb-3">Nhân viên xem lịch, thêm và xác nhận đơn; không xem doanh thu và cài đặt.</p>
          <ul className="mb-3 divide-y divide-gray-100 text-sm">
            {venue.staff.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-2"><span>{s.user.name} · {s.user.email}</span>
                <form action={removeStaffAction.bind(null, venueId, s.id)}><SubmitButton className="btn-ghost btn-sm" confirm="Xóa nhân viên này?">Xóa</SubmitButton></form></li>
            ))}
          </ul>
          <form action={addStaffAction.bind(null, venueId)} className="flex gap-2">
            <input name="email" type="email" className="input" placeholder="Email tài khoản nhân viên" aria-label="Email nhân viên" required />
            <SubmitButton className="btn-secondary shrink-0">Thêm</SubmitButton>
          </form>
        </section>
      </div>

      <section className="card">
        <h2 className="h2 mb-3">Thông tin cụm sân</h2>
        <VenueForm action={updateVenueAction.bind(null, venueId)} venue={venue} submitLabel="Lưu thông tin" />
      </section>
    </div>
  );
}
