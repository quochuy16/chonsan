import Link from "next/link";
import { loginAction } from "../actions";
import { Flash } from "@/components/flash";
import { SubmitButton } from "@/components/submit-button";
import { GoogleButton } from "@/components/google-button";

export const metadata = { title: "Đăng nhập" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; ok?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="container-page max-w-md py-10">
      <h1 className="h1 mb-6">Đăng nhập</h1>
      <Flash searchParams={sp} />
      <form action={loginAction} className="card space-y-4">
        <input type="hidden" name="next" value={sp.next ?? "/"} />
        <GoogleButton next={sp.next ?? "/"} />
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" className="input" required autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="password">Mật khẩu</label>
          <input id="password" name="password" type="password" className="input" required autoComplete="current-password" />
        </div>
        <SubmitButton className="btn-primary w-full">Đăng nhập</SubmitButton>
        <p className="muted text-center">
          Chưa có tài khoản?{" "}
          <Link className="font-semibold text-brand-700" href={`/dang-ky?next=${encodeURIComponent(sp.next ?? "/")}`}>Đăng ký</Link>
        </p>
      </form>
    </div>
  );
}
