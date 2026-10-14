import type { Metadata, Viewport } from "next";
import "./globals.css";

// Layout gốc chỉ có khung HTML. Giao diện người dùng ở (site)/layout.tsx,
// khu quản trị ở (admin)/quan-tri — hai giao diện tách biệt hoàn toàn.
export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  title: { default: "ChonSan – Đặt sân bóng, cho thuê sân, tìm kèo", template: "%s · ChonSan" },
  description:
    "Tìm và đặt sân bóng đá gần bạn, xem giá theo khung giờ, ghép kèo tìm đối và tìm người đá ghép.",
};

export const viewport: Viewport = { themeColor: "#039855" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
