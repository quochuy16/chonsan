import Link from "next/link";
import { registerAction } from "../actions";
import { Flash } from "@/components/flash";
import { SubmitButton } from "@/components/submit-button";
import { GoogleButton } from "@/components/google-button";

export const metadata = { title: "Đăng ký" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; ok?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="container-page max-w-md py-10">
      <h1 className="h1 mb-1">Tạo tài khoản</h1>
      <p className="muted mb-6">Một tài khoản dùng cho cả đặt sân, đội bóng và quản lý sân.</p>
      <Flash searchParams={sp} />
      <form action={registerAction} className="card space-y-4">
        <input type="hidden" name="next" value={sp.next ?? "/"} />
        <GoogleButton next={sp.next ?? "/"} label="Đăng ký nhanh với Google" />
        <div>
          <label className="label" htmlFor="name">Họ tên</label>
          <input id="name" name="name" className="input" required autoComplete="name" />
        </div>
        <div>
          <label className="label" htmlFor="phone">Số điện thoại</label>
          <input id="phone" name="phone" type="tel" className="input" required placeholder="09xxxxxxxx" autoComplete="tel" />
          <p className="mt-1 text-xs text-gray-500">Chỉ hiện cho chủ sân bạn đặt và đội bạn đã chốt kèo.</p>
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" className="input" required autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="password">Mật khẩu (ít nhất 8 ký tự)</label>
          <input id="password" name="password" type="password" minLength={8} className="input" required autoComplete="new-password" />
        </div>
        <label className="flex items-start gap-2 text-sm text-gray-600">
          <input type="checkbox" name="agree" required className="mt-1" />
          <span>Tôi đồng ý với <Link href="/chinh-sach" className="text-brand-700 underline">chính sách quyền riêng tư</Link> và cho phép ChọnSân xử lý dữ liệu cá nhân để cung cấp dịch vụ.</span>
        </label>
        <SubmitButton className="btn-primary w-full">Đăng ký</SubmitButton>
        <p className="muted text-center">
          Đã có tài khoản? <Link className="font-semibold text-brand-700" href="/dang-nhap">Đăng nhập</Link>
        </p>
      </form>
    </div>
  );
}
