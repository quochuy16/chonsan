// Ngẫu nhiên có hạt giống cố định để dữ liệu mẫu giống nhau mỗi lần nạp
let seed = 42;
export const rand = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
export const pick = <T,>(a: T[]) => a[Math.floor(rand() * a.length)];
let codeN = 1000;
export const bookingCode = () => `CS${(codeN++).toString(36).toUpperCase().padStart(6, "0")}`;
