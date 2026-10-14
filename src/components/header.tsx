import Link from "next/link";
import { getCurrentUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { logoutAction } from "@/app/(site)/(auth)/actions";
import { ownerUrl } from "@/lib/server/urls";

const NAV = [
  { href: "/san", label: "Tìm sân", icon: "🏟️" },
  { href: "/keo", label: "Kèo", icon: "🤝" },
];

export async function Header() {
  const user = await getCurrentUser();
  const unread = user ? await db.notification.count({ where: { userId: user.id, read: false } }) : 0;
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="container-page flex h-14 items-center gap-4">
          <Link href="/" className="flex items-center gap-1.5 text-lg font-extrabold text-brand-700">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white">⚽</span>
            ChonSan
          </Link>
          <nav className="hidden flex-1 items-center gap-1 sm:flex">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="btn-ghost btn-sm">
                {n.label}
              </Link>
            ))}
            {/* Web Chủ sân là nền tảng riêng (OWNER_URL) */}
            <a href={ownerUrl()} className="btn-ghost btn-sm">Cho chủ sân ↗</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {user ? (
              <>
                <Link href="/tai-khoan/thong-bao" className="btn-ghost btn-sm relative" aria-label="Thông báo">
                  🔔
                  {unread > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[10px] text-white">
                      {unread}
                    </span>
                  )}
                </Link>
                <Link href="/tai-khoan" className="btn-secondary btn-sm max-w-36 truncate">
                  {user.name}
                </Link>
                <form action={logoutAction} className="hidden sm:block">
                  <button className="btn-ghost btn-sm">Thoát</button>
                </form>
              </>
            ) : (
              <>
                <Link href="/dang-nhap" className="btn-ghost btn-sm">Đăng nhập</Link>
                <Link href="/dang-ky" className="btn-primary btn-sm">Đăng ký</Link>
              </>
            )}
          </div>
        </div>
      </header>
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-gray-200 bg-white sm:hidden">
        {[...NAV, { href: user ? "/tai-khoan" : "/dang-nhap", label: user ? "Tài khoản" : "Đăng nhập", icon: "👤" }].map((n) => (
          <Link key={n.href} href={n.href} className="flex flex-col items-center py-2 text-[11px] text-gray-600">
            <span className="text-lg leading-none">{n.icon}</span>
            {n.label}
          </Link>
        ))}
        <a href={ownerUrl()} className="flex flex-col items-center py-2 text-[11px] text-gray-600">
          <span className="text-lg leading-none">📅</span>
          Chủ sân
        </a>
      </nav>
    </>
  );
}
