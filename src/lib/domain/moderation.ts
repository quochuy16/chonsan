// Chặn nội dung cá cược / "kèo có độ" trong bài đăng (requirement §2 – tuyệt đối tránh).
// "trình độ", "độ tuổi" là từ hợp lệ, nên chỉ bắt "độ" khi đi cùng ngữ cảnh cược.
// Không dùng \b: trong JS nó không coi chữ có dấu (ộ, ợ…) là chữ cái.
const PATTERNS = [
  /(?<![\p{L}\p{N}])cá\s*cược(?![\p{L}\p{N}])/iu,
  /(?<![\p{L}\p{N}])cược(?![\p{L}\p{N}])/iu,
  /(?<![\p{L}\p{N}])(kèo|đá|có|ăn|bao|đánh)\s+độ(?![\p{L}\p{N}])/iu,
  /(?<![\p{L}\p{N}])độ\s+(nước|tiền|bia|\d)/iu,
  /(?<![\p{L}\p{N}])ăn\s+tiền(?![\p{L}\p{N}])/iu,
  /(?<![\p{L}\p{N}])bet(?![\p{L}\p{N}])/iu,
  /(?<![\p{L}\p{N}])nhà\s*cái(?![\p{L}\p{N}])/iu,
];

export function containsBettingTerms(text: string): boolean {
  const t = text.normalize("NFC");
  return PATTERNS.some((p) => p.test(t));
}
