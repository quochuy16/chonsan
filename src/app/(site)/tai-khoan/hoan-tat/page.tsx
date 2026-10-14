import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server/auth";
import { Flash } from "@/components/flash";
import { SubmitButton } from "@/components/submit-button";
import { completeProfileAction } from "../actions";

export const metadata = { title: "Hoàn tất hồ sơ" };

export default async function CompleteProfilePage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; ok?: string }> }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/dang-nhap");
  const next = sp.next ?? "/";
  if (user.phone) redirect(next);
  return (
    <div className="container-page max-w-md py-10">
      <h1 className="h1 mb-1">Còn một bước nữa</h1>
      <p className="muted mb-6">Chủ sân và đội đối cần số điện thoại để liên hệ khi bạn đặt sân hoặc chốt kèo.</p>
      <Flash searchParams={sp} />
      <form action={completeProfileAction} className="card space-y-4">
        <input type="hidden" name="next" value={next} />
        <p className="text-sm text-gray-600">Đăng nhập bằng <strong>{user.email}</strong></p>
        <div><label className="label" htmlFor="name">Họ tên</label><input id="name" name="name" defaultValue={user.name} className="input" required /></div>
        <div>
          <label className="label" htmlFor="phone">Số điện thoại</label>
          <input id="phone" name="phone" type="tel" className="input" required placeholder="09xxxxxxxx" autoComplete="tel" />
          <p className="mt-1 text-xs text-gray-500">Chỉ hiện cho chủ sân bạn đặt và người đã chốt kèo với bạn.</p>
        </div>
        <label className="flex items-start gap-2 text-sm text-gray-600">
          <input type="checkbox" name="agree" required className="mt-1" />
          <span>Tôi đồng ý với <Link href="/chinh-sach" className="text-brand-700 underline">chính sách quyền riêng tư</Link> và cho phép ChonSan xử lý dữ liệu cá nhân để cung cấp dịch vụ.</span>
        </label>
        <SubmitButton className="btn-primary w-full">Hoàn tất</SubmitButton>
      </form>
    </div>
  );
}
