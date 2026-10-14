import { Header } from "@/components/header";

export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <Header />
      <main className="pb-24 sm:pb-12">{children}</main>
      <footer className="border-t border-gray-200 bg-white py-8 text-center text-sm text-gray-500">
        <p>
          <span className="font-semibold text-brand-700">ChonSan</span> — Đặt sân, cho thuê sân, tìm kèo bóng phủi.
        </p>
        <p className="mt-1">ChonSan không giữ tiền: thanh toán chuyển khoản thẳng cho chủ sân. Nói không với cá cược.</p>
      </footer>
    </>
  );
}
