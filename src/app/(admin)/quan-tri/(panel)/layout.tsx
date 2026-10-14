import Link from "next/link";
import { requireAdmin } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { AdminNav } from "../_components/admin-nav";
import { adminLogoutAction } from "../actions";

export const metadata = { title: { default: "Quản trị", template: "%s · Quản trị ChonSan" }, robots: { index: false } };

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const [pendingVenues, openReports] = await Promise.all([
    db.venue.count({ where: { status: "PENDING" } }),
    db.report.count({ where: { status: "OPEN" } }),
  ]);
  const items = [
    { href: "/quan-tri", label: "Tổng quan", icon: "📊" },
    { href: "/quan-tri/nguoi-dung", label: "Người dùng", icon: "👤" },
    { href: "/quan-tri/san", label: "Sân", icon: "🏟️", badge: pendingVenues },
    { href: "/quan-tri/dat-san", label: "Đơn đặt sân", icon: "📅" },

    { href: "/quan-tri/keo", label: "Kèo", icon: "🤝" },
    { href: "/quan-tri/bao-cao", label: "Báo cáo vi phạm", icon: "🚩", badge: openReports },
  ];
  return (
    <div className="min-h-screen bg-slate-100 lg:flex">
      <aside className="bg-slate-900 lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-60 lg:flex-col">
        <div className="flex items-center justify-between px-5 py-4">
          <Link href="/quan-tri" className="flex items-center gap-2 font-extrabold text-white">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-600">⚽</span>
            <span>ChonSan <span className="text-xs font-semibold text-emerald-400">ADMIN</span></span>
          </Link>
          <form action={adminLogoutAction} className="lg:hidden"><button className="text-xs text-slate-400 hover:text-white">Đăng xuất</button></form>
        </div>
        <AdminNav items={items} />
        <div className="mt-auto hidden border-t border-white/10 px-5 py-4 text-sm lg:block">
          <p className="truncate font-medium text-slate-200">{admin.name}</p>
          <p className="truncate text-xs text-slate-500">{admin.email}</p>
          <div className="mt-3 flex items-center justify-between">
            <Link href="/" className="text-xs text-slate-400 hover:text-white">Trang người dùng ↗</Link>
            <form action={adminLogoutAction}><button className="text-xs text-slate-400 hover:text-white">Đăng xuất</button></form>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:ml-60 lg:px-8">{children}</main>
    </div>
  );
}
