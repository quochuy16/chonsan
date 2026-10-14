import { AMENITIES } from "@/lib/domain/constants";
import { BANKS } from "@/lib/domain/vietqr";
import { minutesToHHMM } from "@/lib/domain/time";
import { formatLatLng } from "@/lib/domain/maps";
import { LocationSelect } from "@/components/location-select";
import { MapsLinkInput } from "@/components/maps-link-input";
import { SubmitButton } from "@/components/submit-button";

type V = {
  name: string; address: string; province: string; district: string; lat: number; lng: number; phone: string;
  openMin: number; closeMin: number; amenities: string; description: string; imageUrl: string | null;
  bankBin: string | null; bankAccount: string | null; bankAccountName: string | null;
};

export function VenueForm({ action, venue, submitLabel }: { action: (f: FormData) => void; venue?: V; submitLabel: string }) {
  const amen = new Set((venue?.amenities ?? "PARKING,WATER,LIGHTS").split(","));
  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2"><label className="label" htmlFor="name">Tên cụm sân</label><input id="name" name="name" required defaultValue={venue?.name} className="input" placeholder="VD: Sân bóng Hoàng Cầu" /></div>
        <div className="sm:col-span-2"><label className="label" htmlFor="address">Địa chỉ</label><input id="address" name="address" required defaultValue={venue?.address} className="input" placeholder="Số nhà, đường, phường" /></div>
        <div className="sm:col-span-2"><LocationSelect province={venue?.province} district={venue?.district} /></div>
        <div className="sm:col-span-2"><MapsLinkInput defaultValue={venue ? formatLatLng(venue) : ""} /></div>
        <div><label className="label" htmlFor="phone">SĐT liên hệ</label><input id="phone" name="phone" required defaultValue={venue?.phone} className="input" /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className="label" htmlFor="open">Mở cửa</label><input id="open" name="open" type="time" step={1800} defaultValue={minutesToHHMM(venue?.openMin ?? 330)} className="input" /></div>
          <div><label className="label" htmlFor="close">Đóng cửa</label><input id="close" name="close" type="time" step={1800} defaultValue={minutesToHHMM(venue?.closeMin ?? 1380)} className="input" /></div>
        </div>
        <div className="sm:col-span-2"><label className="label" htmlFor="imageUrl">Link ảnh sân (tùy chọn)</label><input id="imageUrl" name="imageUrl" type="url" defaultValue={venue?.imageUrl ?? ""} className="input" placeholder="https://…" /></div>
        <div className="sm:col-span-2"><label className="label" htmlFor="description">Giới thiệu</label><textarea id="description" name="description" rows={3} defaultValue={venue?.description} className="input" /></div>
      </div>
      <fieldset>
        <legend className="label">Tiện ích</legend>
        <div className="flex flex-wrap gap-3">
          {Object.entries(AMENITIES).map(([k, v]) => (
            <label key={k} className="flex items-center gap-1.5 text-sm"><input type="checkbox" name={`amenity_${k}`} defaultChecked={amen.has(k)} />{v}</label>
          ))}
        </div>
      </fieldset>
      <fieldset className="rounded-xl bg-gray-50 p-3">
        <legend className="label px-1">Tài khoản nhận cọc (tạo mã VietQR)</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <select name="bankBin" defaultValue={venue?.bankBin ?? ""} className="input" aria-label="Ngân hàng"><option value="">Chọn ngân hàng</option>
            {Object.entries(BANKS).map(([bin, n]) => <option key={bin} value={bin}>{n}</option>)}</select>
          <input name="bankAccount" defaultValue={venue?.bankAccount ?? ""} className="input" placeholder="Số tài khoản" aria-label="Số tài khoản" />
          <input name="bankAccountName" defaultValue={venue?.bankAccountName ?? ""} className="input" placeholder="Tên chủ tài khoản" aria-label="Tên chủ tài khoản" />
        </div>
      </fieldset>
      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  );
}
