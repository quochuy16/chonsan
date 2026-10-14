import { describe, expect, it } from "vitest";
import type { ExternalFetch } from "./http";
import { resolveMapsLocation } from "./maps";

/** Giả lập mạng: map url → { status, location?, body? } */
function fakeNet(routes: Record<string, { status: number; location?: string; body?: string }>) {
  const calls: string[] = [];
  const fetcher: ExternalFetch = async (url) => {
    calls.push(url);
    const r = routes[url];
    if (!r) throw new Error("không có mạng tới " + url);
    return { status: r.status, ok: r.status < 300, headers: { get: (n: string) => (n === "location" ? r.location ?? null : null) }, text: async () => r.body ?? "", json: async () => ({}) };
  };
  return { fetcher, calls };
}

describe("resolveMapsLocation", () => {
  it("link đầy đủ / tọa độ: không cần gọi mạng", async () => {
    const { fetcher, calls } = fakeNet({});
    expect(await resolveMapsLocation("21.0215, 105.8262", fetcher)).toEqual({ lat: 21.0215, lng: 105.8262 });
    expect(await resolveMapsLocation("https://www.google.com/maps/place/x/@1,1,17z/data=!3d10.77!4d106.7", fetcher)).toEqual({ lat: 10.77, lng: 106.7 });
    expect(calls).toEqual([]);
  });
  it("link rút gọn: đi theo chuyển hướng tới link có tọa độ", async () => {
    const { fetcher, calls } = fakeNet({
      "https://maps.app.goo.gl/abc": { status: 302, location: "https://www.google.com/maps/place/San+Bong/data=!3d21.0215!4d105.8262?g_st=ic" },
    });
    expect(await resolveMapsLocation("https://maps.app.goo.gl/abc", fetcher)).toEqual({ lat: 21.0215, lng: 105.8262 });
    expect(calls).toHaveLength(1);
  });
  it("trang có vị trí ghim !3d!4d trong nội dung: dùng vị trí ghim", async () => {
    const { fetcher } = fakeNet({
      "https://maps.app.goo.gl/def": { status: 302, location: "https://www.google.com/maps/place/San+Bong" },
      "https://www.google.com/maps/place/San+Bong": { status: 200, body: 'x data=!4m5!3m4!1s0x0:0x0!8m2!3d16.0544!4d108.2022 y' },
    });
    expect(await resolveMapsLocation("https://maps.app.goo.gl/def", fetcher)).toEqual({ lat: 16.0544, lng: 108.2022 });
  });
  it("KHÔNG đoán theo tâm bản đồ center= (là vị trí theo IP máy chủ, sai chỗ)", async () => {
    const { fetcher } = fakeNet({
      "https://maps.app.goo.gl/ghi": { status: 302, location: "https://maps.google.com/?q=San+Bong&ftid=0x1:0x2" },
      "https://maps.google.com/?q=San+Bong&ftid=0x1:0x2": { status: 200, body: 'staticmap?center=21.0239852%2C105.791488 APP_INITIALIZATION_STATE=[[[1,105.79,21.02]' },
    });
    expect(await resolveMapsLocation("https://maps.app.goo.gl/ghi", fetcher)).toMatch(/không chứa vị trí ghim/);
  });
  it("không đi theo chuyển hướng ra ngoài Google", async () => {
    const { fetcher, calls } = fakeNet({ "https://maps.app.goo.gl/evil": { status: 302, location: "http://169.254.169.254/latest" } });
    expect(typeof (await resolveMapsLocation("https://maps.app.goo.gl/evil", fetcher))).toBe("string");
    expect(calls).toEqual(["https://maps.app.goo.gl/evil"]);
  });
  it("từ chối link không phải Google, vị trí ngoài Việt Nam, lỗi mạng", async () => {
    const { fetcher, calls } = fakeNet({});
    expect(await resolveMapsLocation("https://evil.com/maps", fetcher)).toBe("Chỉ nhận link của Google Maps");
    expect(await resolveMapsLocation("48.8566, 2.3522", fetcher)).toMatch(/không nằm ở Việt Nam/);
    expect(await resolveMapsLocation("https://maps.app.goo.gl/offline", fetcher)).toMatch(/Không kết nối được/);
    expect(calls).toEqual(["https://maps.app.goo.gl/offline"]);
  });
});
