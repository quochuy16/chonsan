import { db } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { LEVELS } from "@/lib/domain/constants";
import { todayKey } from "@/lib/domain/time";
import { Flash } from "@/components/flash";
import { LocationSelect } from "@/components/location-select";
import { SubmitButton } from "@/components/submit-button";
import { createPlayerPostAction } from "../../actions";

export const metadata = { title: "Đăng tìm người đá ghép" };

export default async function NewPlayerPost({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser("/keo/nguoi/moi");
  const teams = await db.teamMember.findMany({ where: { userId: user.id, active: true }, include: { team: true } });
  return (
    <div className="container-page max-w-2xl py-8">
      <h1 className="h1 mb-4">Tìm người đá ghép</h1>
      <Flash searchParams={sp} />
      <form action={createPlayerPostAction} className="card space-y-3">
        <div><label className="label" htmlFor="teamId">Đăng cho</label><select id="teamId" name="teamId" className="input"><option value="">Cá nhân / nhóm bạn</option>{teams.map((m) => <option key={m.teamId} value={m.teamId}>{m.team.name}</option>)}</select></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label" htmlFor="date">Ngày</label><input id="date" name="date" type="date" min={todayKey()} required className="input" /></div>
          <div><label className="label" htmlFor="time">Giờ</label><input id="time" name="time" type="time" step={1800} defaultValue="19:00" required className="input" /></div>
        </div>
        <div><label className="label" htmlFor="venueText">Sân</label><input id="venueText" name="venueText" required className="input" /></div>
        <LocationSelect province={user.province ?? undefined} district={user.district ?? undefined} />
        <div className="grid grid-cols-3 gap-3">
          <div><label className="label" htmlFor="needed">Cần mấy người</label><input id="needed" name="needed" type="number" min={1} max={15} defaultValue={2} className="input" /></div>
          <div><label className="label" htmlFor="position">Vị trí</label><input id="position" name="position" className="input" placeholder="Thủ môn, hậu vệ…" /></div>
          <div><label className="label" htmlFor="feePerPerson">Góp mỗi người</label><input id="feePerPerson" name="feePerPerson" className="input" placeholder="70000" inputMode="numeric" /></div>
        </div>
        <div><label className="label" htmlFor="level">Trình độ</label><select id="level" name="level" defaultValue="TRUNG_BINH" className="input">{Object.entries(LEVELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div><label className="label" htmlFor="note">Ghi chú</label><textarea id="note" name="note" rows={2} className="input" /></div>
        <SubmitButton>Đăng</SubmitButton>
      </form>
    </div>
  );
}
