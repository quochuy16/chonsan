import { db } from "@/lib/server/db";
import { loadTeamContext } from "@/lib/server/team";
import { RSVP } from "@/lib/domain/constants";
import { splitEvenly } from "@/lib/domain/fund";
import { formatVND } from "@/lib/domain/money";
import { formatDateTime, todayKey } from "@/lib/domain/time";
import { Flash } from "@/components/flash";
import { Badge } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { createEventAction, deleteEventAction, finishEventAction, rsvpAction } from "../../event-actions";

export const metadata = { title: "Lịch đá" };

export default async function SchedulePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const { team, me, canFund } = await loadTeamContext(slug, { memberOnly: true });
  const [members, events] = await Promise.all([
    db.teamMember.findMany({ where: { teamId: team.id, active: true }, orderBy: { displayName: "asc" } }),
    db.teamEvent.findMany({ where: { teamId: team.id }, include: { attendances: { include: { member: true } } }, orderBy: { start: "desc" }, take: 30 }),
  ]);
  const open = events.filter((e) => !e.finished).reverse();
  const done = events.filter((e) => e.finished);
  return (
    <div className="space-y-5">
      <Flash searchParams={sp} />
      {open.length === 0 && <p className="muted">Chưa có buổi đá sắp tới.</p>}
      {open.map((e) => {
        const by = (r: string) => e.attendances.filter((a) => a.response === r);
        const mine = e.attendances.find((a) => a.memberId === me?.id)?.response;
        const yes = by("YES");
        return (
          <section key={e.id} className="card">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="h2">{e.title} {e.opponent && <span className="font-normal text-gray-500">vs {e.opponent}</span>}</h2>
                <p className="muted">{formatDateTime(e.start)} · {e.venueText || "Chưa chọn sân"}{e.cost ? ` · Tiền sân ${formatVND(e.cost)}` : ""}</p>
              </div>
              <div className="flex gap-1">
                {(Object.keys(RSVP) as (keyof typeof RSVP)[]).map((r) => (
                  <form key={r} action={rsvpAction.bind(null, team.id, e.id, r)}>
                    <SubmitButton className={mine === r ? "btn-primary btn-sm" : "btn-secondary btn-sm"}>{RSVP[r]}</SubmitButton>
                  </form>
                ))}
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
              <p><Badge tone="green">Có đi {yes.length}</Badge> {yes.map((a) => a.member.displayName).join(", ")}</p>
              <p><Badge tone="amber">Chưa chắc {by("MAYBE").length}</Badge> {by("MAYBE").map((a) => a.member.displayName).join(", ")}</p>
              <p><Badge tone="red">Không đi {by("NO").length}</Badge> {by("NO").map((a) => a.member.displayName).join(", ")}</p>
            </div>
            {e.cost > 0 && yes.length > 0 && <p className="mt-2 text-xs text-gray-500">Dự kiến mỗi người: {formatVND(splitEvenly(e.cost, yes.length))}</p>}
            {canFund && (
              <details className="mt-4 rounded-xl bg-gray-50 p-3">
                <summary className="cursor-pointer text-sm font-semibold text-brand-700">Chốt buổi đá (sau trận)</summary>
                <form action={finishEventAction.bind(null, team.id, e.id)} className="mt-3 space-y-3">
                  <div className="overflow-x-auto"><table className="table">
                    <thead><tr><th>Có mặt</th><th>Thành viên</th><th>Bàn</th><th>Kiến tạo</th></tr></thead>
                    <tbody>{members.map((m) => (
                      <tr key={m.id}>
                        <td><input type="checkbox" name={`att_${m.id}`} defaultChecked={e.attendances.some((a) => a.memberId === m.id && a.response === "YES")} aria-label={`${m.displayName} có mặt`} /></td>
                        <td>{m.displayName}</td>
                        <td><input name={`g_${m.id}`} type="number" min={0} defaultValue={0} className="input w-16 py-1" aria-label="Bàn thắng" /></td>
                        <td><input name={`a_${m.id}`} type="number" min={0} defaultValue={0} className="input w-16 py-1" aria-label="Kiến tạo" /></td>
                      </tr>
                    ))}</tbody>
                  </table></div>
                  <div className="grid grid-cols-3 gap-2">
                    <div><label className="label" htmlFor={`sf-${e.id}`}>Bàn thắng</label><input id={`sf-${e.id}`} name="scoreFor" type="number" min={0} className="input" /></div>
                    <div><label className="label" htmlFor={`sa-${e.id}`}>Bàn thua</label><input id={`sa-${e.id}`} name="scoreAgainst" type="number" min={0} className="input" /></div>
                    <div><label className="label" htmlFor={`c-${e.id}`}>Tiền sân + nước</label><input id={`c-${e.id}`} name="cost" defaultValue={e.cost} className="input" inputMode="numeric" /></div>
                  </div>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="split" defaultChecked={!e.chargesIssued} disabled={e.chargesIssued} /> Chia đều tiền cho người có mặt (ghi vào quỹ: mỗi người một khoản phải đóng + một khoản chi tiền sân)</label>
                  <div className="flex gap-2">
                    <SubmitButton>Chốt buổi đá</SubmitButton>
                  </div>
                </form>
                <form action={deleteEventAction.bind(null, team.id, e.id)} className="mt-2"><SubmitButton className="btn-ghost btn-sm text-red-600" confirm="Xóa buổi đá này?">Xóa buổi đá</SubmitButton></form>
              </details>
            )}
          </section>
        );
      })}

      {canFund && (
        <section className="card">
          <h2 className="h2 mb-3">Tạo buổi đá mới</h2>
          <form action={createEventAction.bind(null, team.id)} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input name="title" className="input" placeholder="Tên (VD: Đá tối thứ 3)" aria-label="Tên buổi đá" />
            <input name="date" type="date" min={todayKey()} required className="input" aria-label="Ngày" />
            <input name="time" type="time" step={1800} defaultValue="19:00" required className="input" aria-label="Giờ" />
            <input name="venueText" className="input" placeholder="Sân" defaultValue={team.homeVenue} aria-label="Sân" />
            <input name="opponent" className="input" placeholder="Đối thủ (nếu có)" aria-label="Đối thủ" />
            <input name="cost" className="input" placeholder="Tiền sân dự kiến" inputMode="numeric" aria-label="Tiền sân" />
            <SubmitButton className="btn-primary sm:col-span-3">Tạo & gửi điểm danh</SubmitButton>
          </form>
        </section>
      )}

      <section className="card">
        <h2 className="h2 mb-2">Đã đá</h2>
        {done.length === 0 ? <p className="muted">Chưa có.</p> : (
          <ul className="divide-y divide-gray-100 text-sm">
            {done.map((e) => (
              <li key={e.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span>{formatDateTime(e.start)} · <strong>{e.title}</strong>{e.opponent && ` vs ${e.opponent}`}</span>
                <span className="text-gray-500">{e.scoreFor != null && <strong className="text-gray-900">{e.scoreFor}–{e.scoreAgainst} · </strong>}{e.attendances.filter((a) => a.attended).length} người{e.chargesIssued && ` · đã chia ${formatVND(e.cost)}`}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
