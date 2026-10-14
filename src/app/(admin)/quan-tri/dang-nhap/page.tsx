import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server/auth";
import { isGoogleEnabled } from "@/lib/server/google";
import { SubmitButton } from "@/components/submit-button";
import { adminLoginAction, adminLogoutAction } from "../actions";

export const metadata = { title: "Đăng nhập quản trị", robots: { index: false } };

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  const next = sp.next?.startsWith("/quan-tri") ? sp.next : "/quan-tri";
  const user = await getCurrentUser();
  if (user?.role === "ADMIN" && !sp.error) redirect(next);
  const input = "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500";
  return (
    <div className="grid min-h-screen place-items-center bg-slate-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-emerald-600 text-2xl">⚽</span>
          <h1 className="mt-3 text-xl font-bold text-white">Quản trị ChọnSân</h1>
          <p className="text-sm text-slate-400">Chỉ dành cho tài khoản quản trị viên</p>
        </div>
        <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          {sp.error && <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{sp.error}</p>}
          {user && user.role !== "ADMIN" && (
            <form action={adminLogoutAction} className="text-sm text-slate-400">
              Đang đăng nhập: {user.email}. <button className="text-emerald-400 underline">Đăng xuất để đổi tài khoản</button>
            </form>
          )}
          {isGoogleEnabled() && (
            <a href={`/auth/google?next=${encodeURIComponent(next)}`} className="flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-100">
              <span className="font-bold text-[#4285F4]">G</span> Đăng nhập với Google
            </a>
          )}
          <form action={adminLoginAction} className="space-y-3">
            <input type="hidden" name="next" value={next} />
            <div><label htmlFor="email" className="mb-1 block text-sm text-slate-300">Email</label><input id="email" name="email" type="email" required className={input} autoComplete="email" /></div>
            <div><label htmlFor="password" className="mb-1 block text-sm text-slate-300">Mật khẩu</label><input id="password" name="password" type="password" required className={input} autoComplete="current-password" /></div>
            <SubmitButton className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500">Đăng nhập</SubmitButton>
          </form>
        </div>
        <p className="mt-4 text-center text-xs text-slate-500"><Link href="/" className="hover:text-slate-300">← Về trang ChọnSân</Link></p>
      </div>
    </div>
  );
}
