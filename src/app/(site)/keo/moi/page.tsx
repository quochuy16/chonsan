import { requireUser } from "@/lib/server/auth";
import { COST_SPLIT, LEVELS, PITCH_SIZES } from "@/lib/domain/constants";
import { todayKey } from "@/lib/domain/time";
import { Flash } from "@/components/flash";
import { LocationSelect } from "@/components/location-select";
import { SubmitButton } from "@/components/submit-button";
import { createMatchPostAction } from "../actions";

export const metadata = { title: "Đăng kèo tìm đối" };

export default async function NewMatchPost({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser("/keo/moi");
  return (
    <div className="container-page max-w-2xl py-8">
      <h1 className="h1 mb-4">Đăng kèo tìm đối</h1>
      <Flash searchParams={sp} />
      <form action={createMatchPostAction} className="card space-y-3">
        <div><label className="label" htmlFor="teamName">Tên đội của bạn</label><input id="teamName" name="teamName" required maxLength={60} className="input" placeholder="VD: FC Văn Phòng Cầu Giấy" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label" htmlFor="date">Ngày</label><input id="date" name="date" type="date" min={todayKey()} required className="input" /></div>
          <div><label className="label" htmlFor="time">Giờ</label><input id="time" name="time" type="time" step={1800} defaultValue="19:00" required className="input" /></div>
        </div>
        <div><label className="label" htmlFor="venueText">Sân</label><input id="venueText" name="venueText" required className="input" placeholder="VD: Sân Hoàng Cầu (đã đặt)" /></div>
        <LocationSelect province={user.province ?? undefined} district={user.district ?? undefined} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div><label className="label" htmlFor="pitchSize">Loại sân</label><select id="pitchSize" name="pitchSize" defaultValue="7" className="input">{Object.entries(PITCH_SIZES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div><label className="label" htmlFor="level">Trình độ</label><select id="level" name="level" defaultValue={user.skillLevel ?? "TRUNG_BINH"} className="input">{Object.entries(LEVELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div><label className="label" htmlFor="costSplit">Tiền sân</label><select id="costSplit" name="costSplit" className="input">{Object.entries(COST_SPLIT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        </div>
        <div><label className="label" htmlFor="note">Ghi chú</label><textarea id="note" name="note" rows={2} className="input" placeholder="VD: đá vui vẻ, có trọng tài, áo xanh" /></div>
        <p className="text-xs text-gray-500">Không ghi mức cược/độ — bài sẽ bị từ chối.</p>
        <SubmitButton>Đăng kèo</SubmitButton>
      </form>
    </div>
  );
}
