import { requireUser } from "@/lib/server/auth";
import { Flash } from "@/components/flash";
import { VenueForm } from "../venue-form";
import { createVenueAction } from "../venue-actions";

export const metadata = { title: "Đăng ký cụm sân" };

export default async function NewVenuePage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireUser("/chu-san/moi");
  const sp = await searchParams;
  return (
    <div className="container-page max-w-3xl py-8">
      <h1 className="h1">Đăng ký cụm sân</h1>
      <p className="muted mb-5">Sân sẽ hiển thị công khai sau khi quản trị viên duyệt (thường trong 24 giờ).</p>
      <Flash searchParams={sp} />
      <div className="card"><VenueForm action={createVenueAction} submitLabel="Tạo cụm sân" /></div>
    </div>
  );
}
