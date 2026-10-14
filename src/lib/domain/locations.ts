// Khu vực tìm sân. Từ 07/2025 Việt Nam bỏ cấp quận/huyện, nhưng người chơi vẫn gọi sân theo
// tên quận cũ ("sân Cầu Giấy"), nên ChonSan dùng các tên này làm "khu vực" để tìm kiếm.
export const LOCATIONS: Record<string, { lat: number; lng: number; areas: string[] }> = {
  "Hà Nội": {
    lat: 21.0285,
    lng: 105.8542,
    areas: [
      "Ba Đình", "Hoàn Kiếm", "Đống Đa", "Hai Bà Trưng", "Cầu Giấy", "Thanh Xuân", "Hoàng Mai",
      "Long Biên", "Tây Hồ", "Nam Từ Liêm", "Bắc Từ Liêm", "Hà Đông", "Gia Lâm", "Đông Anh",
    ],
  },
  "TP. Hồ Chí Minh": {
    lat: 10.7769,
    lng: 106.7009,
    areas: [
      "Quận 1", "Quận 3", "Quận 4", "Quận 5", "Quận 6", "Quận 7", "Quận 8", "Quận 10", "Quận 11",
      "Quận 12", "Bình Thạnh", "Gò Vấp", "Phú Nhuận", "Tân Bình", "Tân Phú", "Bình Tân", "Thủ Đức",
    ],
  },
  "Đà Nẵng": {
    lat: 16.0544,
    lng: 108.2022,
    areas: ["Hải Châu", "Thanh Khê", "Sơn Trà", "Ngũ Hành Sơn", "Liên Chiểu", "Cẩm Lệ"],
  },
};

export const PROVINCES = Object.keys(LOCATIONS);

export function isValidLocation(province: string, area: string): boolean {
  return LOCATIONS[province]?.areas.includes(area) ?? false;
}
