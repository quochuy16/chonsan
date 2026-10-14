import { stripDiacritics } from "./text";

// Chuẩn VietQR (EMVCo + Napas 247). Quét bằng mọi app ngân hàng Việt Nam.
export const BANKS: Record<string, string> = {
  "970436": "Vietcombank",
  "970415": "VietinBank",
  "970418": "BIDV",
  "970405": "Agribank",
  "970407": "Techcombank",
  "970422": "MB Bank",
  "970416": "ACB",
  "970432": "VPBank",
  "970423": "TPBank",
  "970403": "Sacombank",
  "970441": "VIB",
  "970426": "MSB",
  "970437": "HDBank",
  "970448": "OCB",
  "970443": "SHB",
};

const tlv = (id: string, value: string) => `${id}${String(value.length).padStart(2, "0")}${value}`;

export function crc16(input: string): string {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Nội dung chuyển khoản: không dấu, chỉ chữ số & khoảng trắng, tối đa 25 ký tự */
export function sanitizeTransferNote(s: string): string {
  return stripDiacritics(s)
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 25);
}

export function buildVietQR(p: { bankBin: string; account: string; amount?: number; note?: string }): string {
  const merchant = tlv("00", "A000000727") + tlv("01", tlv("00", p.bankBin) + tlv("01", p.account)) + tlv("02", "QRIBFTTA");
  let payload = tlv("00", "01") + tlv("01", p.amount ? "12" : "11") + tlv("38", merchant) + tlv("53", "704");
  if (p.amount) payload += tlv("54", String(Math.round(p.amount)));
  payload += tlv("58", "VN");
  const note = p.note ? sanitizeTransferNote(p.note) : "";
  if (note) payload += tlv("62", tlv("08", note));
  payload += "6304";
  return payload + crc16(payload);
}
