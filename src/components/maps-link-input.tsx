"use client";
import { useState } from "react";
import { formatLatLng, isInVietnam, isShortMapsLink, parseMapsCoordinates } from "@/lib/domain/maps";

/** Ô dán link Google Maps (hoặc tọa độ); báo ngay đã đọc được vị trí hay chưa */
export function MapsLinkInput({ defaultValue = "" }: { defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue);
  const v = value.trim();
  const coords = v ? parseMapsCoordinates(v) : null;
  let status: React.ReactNode = null;
  if (coords && isInVietnam(coords)) {
    status = (
      <span className="text-brand-700">
        ✓ Đã nhận vị trí {formatLatLng(coords)} ·{" "}
        <a className="underline" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${coords.lat},${coords.lng}`}>Xem trên Google Maps ↗</a>
      </span>
    );
  } else if (coords) {
    status = <span className="text-red-600">Vị trí này không nằm ở Việt Nam — kiểm tra lại link</span>;
  } else if (v && isShortMapsLink(v)) {
    status = <span className="text-brand-700">✓ Link chia sẻ Google Maps — hệ thống sẽ tự đọc vị trí khi bạn bấm lưu</span>;
  } else if (v) {
    status = <span className="text-amber-700">Chưa đọc được vị trí. Hãy dán link Google Maps (bắt đầu bằng https://) hoặc tọa độ</span>;
  }
  return (
    <div>
      <label className="label" htmlFor="mapsLink">Vị trí trên Google Maps</label>
      <input id="mapsLink" name="mapsLink" required value={value} onChange={(e) => setValue(e.target.value)} className="input"
        placeholder="https://maps.app.goo.gl/…" inputMode="url" autoComplete="off" />
      <p className="mt-1 text-xs">{status}</p>
      <details className="mt-1 text-xs text-gray-500">
        <summary className="cursor-pointer">Lấy link thế nào?</summary>
        <ol className="mt-1 list-decimal space-y-0.5 pl-5">
          <li>Mở Google Maps, tìm sân của bạn (hoặc nhấn giữ đúng vị trí sân để thả ghim).</li>
          <li>Bấm <strong>Chia sẻ</strong> → <strong>Sao chép đường liên kết</strong>.</li>
          <li>Dán vào ô trên. Cũng có thể dán tọa độ dạng <code>21.0215, 105.8262</code>.</li>
        </ol>
      </details>
    </div>
  );
}
