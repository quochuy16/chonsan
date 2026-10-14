import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server/auth";
import { OWNER_REGISTER, isOwnerPath } from "@/lib/server/urls";
import { loginAction } from "@/app/(site)/(auth)/actions";
import { Flash } from "@/components/flash";
import { GoogleButton } from "@/components/google-button";
import { SubmitButton } from "@/components/submit-button";

export const metadata = { title: "Đăng nhập", robots: { index: false } };

export default async function OwnerLoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; ok?: string }> }) {
  const sp = await searchParams;
  const next = sp.next && isOwnerPath(sp.next) ? sp.next : "/chu-san";
  if ((await getCurrentUser()) && !sp.error) redirect(next);
  return (
    <div className="container-page max-w-md py-10">
      <h1 className="h1 mb-1">Đăng nhập Chủ sân</h1>
      <p className="muted mb-6">Dùng chung tài khoản ChonSan. Nhân viên sân cũng đăng nhập ở đây.</p>
      <Flash searchParams={sp} />
      <form action={loginAction} className="card space-y-4">
        <input type="hidden" name="next" value={next} />
        <GoogleButton next={next} />
        <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" className="input" required autoComplete="email" /></div>
        <div><label className="label" htmlFor="password">Mật khẩu</label><input id="password" name="password" type="password" className="input" required autoComplete="current-password" /></div>
        <SubmitButton className="btn-primary w-full">Đăng nhập</SubmitButton>
        <p className="muted text-center">Chưa có tài khoản? <Link className="font-semibold text-brand-700" href={`${OWNER_REGISTER}?next=${encodeURIComponent(next)}`}>Đăng ký chủ sân</Link></p>
      </form>
    </div>
  );
}
