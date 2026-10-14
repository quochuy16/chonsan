"use client";
import { useState } from "react";
import { LOCATIONS, PROVINCES } from "@/lib/domain/locations";

export function LocationSelect({
  province: initialProvince = "",
  district: initialDistrict = "",
  allowAll = false,
}: {
  province?: string;
  district?: string;
  allowAll?: boolean;
}) {
  const [province, setProvince] = useState(initialProvince || (allowAll ? "" : PROVINCES[0]));
  const areas = LOCATIONS[province]?.areas ?? [];
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="label" htmlFor="province">Tỉnh / thành</label>
        <select id="province" name="province" className="input" value={province} required={!allowAll}
          onChange={(e) => setProvince(e.target.value)}>
          {allowAll && <option value="">Tất cả</option>}
          {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="district">Khu vực</label>
        <select id="district" name="district" className="input" defaultValue={initialDistrict} key={province} required={!allowAll}>
          {allowAll && <option value="">Tất cả</option>}
          {areas.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>
    </div>
  );
}
