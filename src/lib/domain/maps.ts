// Đọc tọa độ từ link Google Maps / chuỗi tọa độ mà chủ sân dán vào.

export interface LatLng {
  lat: number;
  lng: number;
}

const valid = (lat: number, lng: number) =>
  Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);

const NUM = String.raw`(-?\d{1,3}(?:\.\d+)?)`;

/** Lãnh thổ Việt Nam (gồm biển đảo) — để cảnh báo khi dán nhầm vị trí */
export function isInVietnam({ lat, lng }: LatLng): boolean {
  return lat >= 7 && lat <= 24 && lng >= 102 && lng <= 118;
}

/**
 * Lấy tọa độ từ:
 * - link đầy đủ: …/maps/place/…/@21.02,105.82,17z/data=…!3d21.0215!4d105.8262 (ưu tiên !3d!4d = vị trí ghim)
 * - link có tham số: ?q=21.02,105.82 · ?query= · ?ll= · ?center= · ?destination=
 * - chuỗi tọa độ: "21.0215, 105.8262"
 * Trả null nếu không đọc được (vd link rút gọn maps.app.goo.gl — cần mở link trước).
 */
export function parseMapsCoordinates(input: string): LatLng | null {
  const text = decodeSafe(input.trim());
  const pin = text.match(new RegExp(String.raw`!3d${NUM}!4d${NUM}`));
  if (pin && valid(+pin[1], +pin[2])) return { lat: +pin[1], lng: +pin[2] };
  const param = text.match(new RegExp(String.raw`[?&](?:q|query|ll|center|destination|daddr)=(?:loc:)?${NUM}\s*,\s*${NUM}`));
  if (param && valid(+param[1], +param[2])) return { lat: +param[1], lng: +param[2] };
  const at = text.match(new RegExp(String.raw`@${NUM},${NUM}`));
  if (at && valid(+at[1], +at[2])) return { lat: +at[1], lng: +at[2] };
  const plain = text.match(new RegExp(String.raw`^\(?${NUM}\s*[,;\s]\s*${NUM}\)?$`));
  if (plain && valid(+plain[1], +plain[2])) return { lat: +plain[1], lng: +plain[2] };
  return null;
}

function decodeSafe(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

// google.com, google.com.vn, google.vn… (đuôi phải kết thúc ngay sau mã quốc gia), goo.gl, g.co
const GOOGLE_HOSTS = /^(?:[a-z0-9-]+\.)*(?:google\.(?:com(?:\.[a-z]{2})?|co\.[a-z]{2}|[a-z]{2})|goo\.gl|g\.co)$/i;

/** Chỉ mở link thuộc Google (tránh để máy chủ bị lợi dụng gọi tới địa chỉ lạ) */
export function isGoogleMapsHost(url: string): boolean {
  try {
    const u = new URL(url);
    return (u.protocol === "https:" || u.protocol === "http:") && GOOGLE_HOSTS.test(u.hostname);
  } catch {
    return false;
  }
}

/** Link rút gọn từ nút "Chia sẻ" — không chứa tọa độ, phải mở để lấy link đầy đủ */
export function isShortMapsLink(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname === "maps.app.goo.gl" || (u.hostname === "goo.gl" && u.pathname.startsWith("/maps")) || u.hostname === "g.co";
  } catch {
    return false;
  }
}

/** Định dạng tọa độ để hiển thị / điền lại vào ô */
export function formatLatLng({ lat, lng }: LatLng): string {
  return `${lat.toFixed(6).replace(/0+$/, "").replace(/\.$/, "")}, ${lng.toFixed(6).replace(/0+$/, "").replace(/\.$/, "")}`;
}
