import { describe, expect, it } from "vitest";
import { formatLatLng, isGoogleMapsHost, isInVietnam, isShortMapsLink, parseMapsCoordinates } from "./maps";

describe("đọc tọa độ Google Maps", () => {
  it("link địa điểm đầy đủ: ưu tiên vị trí ghim !3d!4d hơn tâm màn hình @", () => {
    const url = "https://www.google.com/maps/place/S%C3%A2n+b%C3%B3ng/@21.0201,105.8240,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d21.0215123!4d105.8262456!16s";
    expect(parseMapsCoordinates(url)).toEqual({ lat: 21.0215123, lng: 105.8262456 });
  });
  it("link chỉ có @tâm bản đồ", () => {
    expect(parseMapsCoordinates("https://www.google.com/maps/@10.7769,106.7009,15z")).toEqual({ lat: 10.7769, lng: 106.7009 });
  });
  it("link có tham số q / query / ll", () => {
    expect(parseMapsCoordinates("https://maps.google.com/?q=16.0544,108.2022")).toEqual({ lat: 16.0544, lng: 108.2022 });
    expect(parseMapsCoordinates("https://www.google.com/maps/search/?api=1&query=21.03%2C105.85")).toEqual({ lat: 21.03, lng: 105.85 });
    expect(parseMapsCoordinates("https://maps.google.com/maps?ll=21.5,105.5&z=10")).toEqual({ lat: 21.5, lng: 105.5 });
  });
  it("chuỗi tọa độ dán thẳng", () => {
    expect(parseMapsCoordinates("21.0215, 105.8262")).toEqual({ lat: 21.0215, lng: 105.8262 });
    expect(parseMapsCoordinates("(10.77 106.70)")).toEqual({ lat: 10.77, lng: 106.7 });
  });
  it("không đọc được: link rút gọn, chữ thường, tọa độ sai", () => {
    expect(parseMapsCoordinates("https://maps.app.goo.gl/AbCdEf123")).toBeNull();
    expect(parseMapsCoordinates("Sân bóng Hoàng Cầu")).toBeNull();
    expect(parseMapsCoordinates("121.5, 105.8")).toBeNull();
  });
  it("nhận diện link rút gọn & chỉ cho phép host của Google", () => {
    expect(isShortMapsLink("https://maps.app.goo.gl/AbCdEf123")).toBe(true);
    expect(isShortMapsLink("https://www.google.com/maps/@1,2,3z")).toBe(false);
    expect(isGoogleMapsHost("https://maps.app.goo.gl/x")).toBe(true);
    expect(isGoogleMapsHost("https://www.google.com.vn/maps/place/x")).toBe(true);
    expect(isGoogleMapsHost("https://evil.com/?google.com")).toBe(false);
    expect(isGoogleMapsHost("https://google.com.evil.com/maps")).toBe(false);
    expect(isGoogleMapsHost("http://127.0.0.1/maps")).toBe(false);
  });
  it("kiểm tra trong lãnh thổ Việt Nam & định dạng", () => {
    expect(isInVietnam({ lat: 21.02, lng: 105.82 })).toBe(true);
    expect(isInVietnam({ lat: 48.85, lng: 2.35 })).toBe(false);
    expect(formatLatLng({ lat: 21.02, lng: 105.8262456 })).toBe("21.02, 105.826246");
  });
});
