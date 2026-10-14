import { LEVELS } from "@/lib/domain/constants";
import { BANKS } from "@/lib/domain/vietqr";
import { LocationSelect } from "@/components/location-select";
import { SubmitButton } from "@/components/submit-button";

type T = { name: string; province: string; district: string; level: string; homeVenue: string; description: string; isPublic: boolean; monthlyFee: number; bankBin: string | null; bankAccount: string | null; bankAccountName: string | null };

export function TeamForm({ action, team, submitLabel }: { action: (f: FormData) => void; team?: T; submitLabel: string }) {
  return (
    <form action={action} className="space-y-3">
      <div><label className="label" htmlFor="name">Tên đội</label><input id="name" name="name" required defaultValue={team?.name} className="input" placeholder="VD: FC Văn Phòng Cầu Giấy" /></div>
      <LocationSelect province={team?.province} district={team?.district} />
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label" htmlFor="level">Trình độ</label>
          <select id="level" name="level" defaultValue={team?.level ?? "TRUNG_BINH"} className="input">{Object.entries(LEVELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div><label className="label" htmlFor="monthlyFee">Quỹ tháng / người</label><input id="monthlyFee" name="monthlyFee" defaultValue={team?.monthlyFee ?? 200000} className="input" inputMode="numeric" /></div>
      </div>
      <div><label className="label" htmlFor="homeVenue">Sân nhà / giờ hay đá</label><input id="homeVenue" name="homeVenue" defaultValue={team?.homeVenue} className="input" placeholder="VD: Sân Hoàng Cầu, tối thứ 3 & thứ 6" /></div>
      <div><label className="label" htmlFor="description">Giới thiệu</label><textarea id="description" name="description" rows={2} defaultValue={team?.description} className="input" /></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isPublic" defaultChecked={team?.isPublic ?? true} /> Hiện trang đội công khai (để đội khác tìm & ghép kèo)</label>
      <fieldset className="rounded-xl bg-gray-50 p-3">
        <legend className="label px-1">Tài khoản thủ quỹ (tạo mã VietQR thu quỹ)</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <select name="bankBin" defaultValue={team?.bankBin ?? ""} className="input" aria-label="Ngân hàng"><option value="">Ngân hàng</option>{Object.entries(BANKS).map(([b, n]) => <option key={b} value={b}>{n}</option>)}</select>
          <input name="bankAccount" defaultValue={team?.bankAccount ?? ""} className="input" placeholder="Số tài khoản" aria-label="Số tài khoản" />
          <input name="bankAccountName" defaultValue={team?.bankAccountName ?? ""} className="input" placeholder="Tên chủ TK" aria-label="Tên chủ tài khoản" />
        </div>
      </fieldset>
      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  );
}
