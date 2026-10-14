import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server/auth";
import { OWNER_LOGIN, isOwnerPath, siteUrl } from "@/lib/server/urls";
import { registerAction } from "@/app/(site)/(auth)/actions";
import { Flash } from "@/components/flash";
import { GoogleButton } from "@/components/google-button";
import { SubmitButton } from "@/components/submit-button";

export const metadata = { title: "Đăng ký chủ sân" };

export default async function OwnerRegisterPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; ok?: string }> }) {
  const sp = await searchParams;
  const next = sp.next && isOwnerPath(sp.next) ? sp.next : "/chu-san/moi";
  if ((await getCurrentUser()) && !sp.error) redirect(next);
  return (
    <div className="container-page max-w-md py-10">
      <h1 className="h1 mb-1">Đăng ký chủ sân</h1>
      <p className="muted mb-6">Miễn phí: 1 cụm sân, tối đa 2 sân con. Sau khi đăng ký, bạn khai báo cụm sân và chờ duyệt.</p>
      <Flash searchParams={sp} />
      <form action={registerAction} className="card space-y-4">
        <input type="hidden" name="next" value={next} />
        <GoogleButton next={next} label="Đăng ký nhanh với Google" />
        <div><label className="label" htmlFor="name">Họ tên</label><input id="name" name="name" className="input" required autoComplete="name" /></div>
        <div><label className="label" htmlFor="phone">Số điện thoại</label><input id="phone" name="phone" type="tel" className="input" required placeholder="09xxxxxxxx" autoComplete="tel" /></div>
        <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" className="input" required autoComplete="email" /></div>
        <div><label className="label" htmlFor="password">Mật khẩu</label><input id="password" name="password" type="password" className="input" required minLength={8} autoComplete="new-password" /></div>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="agree" required className="mt-1" /> <span>Tôi đồng ý với <a className="text-brand-700 underline" href={siteUrl("/chinh-sach")} target="_blank" rel="noopener">chính sách quyền riêng tư</a> và cho phép ChonSan xử lý dữ liệu cá nhân để cung cấp dịch vụ.</span></label>
        <SubmitButton className="btn-primary w-full">Tạo tài khoản</SubmitButton>
        <p className="muted text-center">Đã có tài khoản? <Link className="font-semibold text-brand-700" href={`${OWNER_LOGIN}?next=${encodeURIComponent(next)}`}>Đăng nhập</Link></p>
      </form>
    </div>
  );
}
