import Link from "next/link";
import { getCurrentUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { OWNER_LOGIN, OWNER_REGISTER, siteUrl } from "@/lib/server/urls";
import { ownerLogoutAction } from "@/app/(site)/(auth)/actions";

export const metadata = { title: { default: "ChonSan Chủ sân", template: "%s · ChonSan Chủ sân" } };

/** Web Chủ sân: header, menu, đăng nhập riêng — tách khỏi web Tìm sân (xem src/lib/server/urls.ts) */
export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const pending = user
    ? await db.booking.count({ where: { status: "PENDING", pitch: { venue: { OR: [{ ownerId: user.id }, { staff: { some: { userId: user.id } } }] } } } })
    : 0;
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-40 border-b border-gray-800 bg-gray-900 text-white">
        <div className="container-page flex h-14 items-center gap-3">
          <Link href="/chu-san" className="flex items-center gap-1.5 text-lg font-extrabold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600">⚽</span>
            ChonSan <span className="rounded-md bg-brand-600 px-1.5 py-0.5 text-[11px] font-bold uppercase">Chủ sân</span>
          </Link>
          {user && (
            <nav className="hidden items-center gap-1 sm:flex">
              <Link href="/chu-san" className="rounded-lg px-3 py-1.5 text-sm text-gray-300 hover:bg-white/10 hover:text-white">
                Sân của tôi{pending > 0 && <span className="ml-1.5 rounded-full bg-amber-400 px-1.5 text-[11px] font-bold text-gray-900">{pending}</span>}
              </Link>
              <Link href="/chu-san/moi" className="rounded-lg px-3 py-1.5 text-sm text-gray-300 hover:bg-white/10 hover:text-white">+ Thêm cụm sân</Link>
            </nav>
          )}
          <div className="ml-auto flex items-center gap-2 text-sm">
            <a href={siteUrl("/")} className="hidden rounded-lg px-3 py-1.5 text-gray-400 hover:text-white md:block">Web tìm sân ↗</a>
            {user ? (
              <>
                <a href={siteUrl("/tai-khoan")} className="max-w-36 truncate rounded-lg border border-white/20 px-3 py-1.5 hover:bg-white/10">{user.name}</a>
                <form action={ownerLogoutAction}><button className="rounded-lg px-2 py-1.5 text-gray-400 hover:text-white">Thoát</button></form>
              </>
            ) : (
              <>
                <Link href={OWNER_LOGIN} className="rounded-lg px-3 py-1.5 text-gray-300 hover:text-white">Đăng nhập</Link>
                <Link href={OWNER_REGISTER} className="rounded-lg bg-brand-600 px-3 py-1.5 font-semibold hover:bg-brand-700">Đăng ký</Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="pb-12">{children}</main>
      <footer className="border-t border-gray-200 py-6 text-center text-xs text-gray-500">
        ChonSan Chủ sân — lịch sân, bảng giá, nhận đặt online. Tiền khách chuyển thẳng cho bạn qua VietQR.
      </footer>
    </div>
  );
}
