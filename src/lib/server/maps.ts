import { isGoogleMapsHost, isInVietnam, parseMapsCoordinates, type LatLng } from "@/lib/domain/maps";
import { externalFetch, type ExternalFetch } from "./http";

const MAX_HOPS = 5;
// Trong HTML trang Google Maps chỉ tin vị trí ghim dạng !3d..!4d.. — KHÔNG dùng center=/APP_INITIALIZATION_STATE:
// đó là tâm bản đồ mặc định theo IP của máy chủ, không phải vị trí địa điểm (đã kiểm chứng: ra sai chỗ).
const BODY_PATTERNS = [/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/];

/**
 * Nhận link Google Maps (đầy đủ hoặc rút gọn maps.app.goo.gl) / chuỗi tọa độ → tọa độ.
 * Link rút gọn: đi theo chuyển hướng từng bước, chỉ đi tiếp khi địa chỉ vẫn thuộc Google.
 * Trả chuỗi lỗi tiếng Việt nếu không xác định được.
 */
export async function resolveMapsLocation(input: string, fetcher: ExternalFetch = externalFetch): Promise<LatLng | string> {
  const raw = input.trim();
  if (!raw) return "Vui lòng dán link Google Maps của sân";
  const direct = parseMapsCoordinates(raw);
  if (direct) return checkVietnam(direct);
  if (!/^https?:\/\//i.test(raw)) return "Không đọc được vị trí. Hãy dán link Google Maps (bắt đầu bằng https://) hoặc tọa độ dạng 21.0215, 105.8262";
  if (!isGoogleMapsHost(raw)) return "Chỉ nhận link của Google Maps";

  let url = raw;
  try {
    for (let hop = 0; hop <= MAX_HOPS; hop++) {
      const res = await fetcher(url, { redirect: "manual", headers: { "User-Agent": "Mozilla/5.0 ChonSan", "Accept-Language": "vi" }, timeoutMs: 10_000 });
      const location = res.headers.get("location");
      if (res.status >= 300 && res.status < 400 && location) {
        url = new URL(location, url).toString();
        const found = parseMapsCoordinates(url);
        if (found) return checkVietnam(found);
        if (!isGoogleMapsHost(url)) return "Link chuyển tới trang không phải Google Maps";
        continue;
      }
      if (res.status >= 400) return "Link Google Maps không mở được (có thể đã hết hạn), hãy chia sẻ lại";
      const body = (await res.text()).slice(0, 1_000_000);
      for (const p of BODY_PATTERNS) {
        const m = body.match(p);
        if (m) return checkVietnam({ lat: Number(m[1]), lng: Number(m[2]) });
      }
      return "Link này không chứa vị trí ghim chính xác. Trên Google Maps, nhấn giữ đúng chỗ sân để thả ghim rồi chia sẻ, hoặc dán tọa độ dạng 21.0215, 105.8262";
    }
    return "Link chuyển hướng quá nhiều lần";
  } catch (e) {
    console.error("[maps] resolve failed", e);
    return "Không kết nối được tới Google Maps để đọc link rút gọn. Hãy thử lại, hoặc dán tọa độ dạng 21.0215, 105.8262";
  }
}

function checkVietnam(p: LatLng): LatLng | string {
  return isInVietnam(p) ? p : "Vị trí này không nằm ở Việt Nam — kiểm tra lại link";
}
