import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/server/auth";
import { getVenueAccess } from "@/lib/server/permissions";
import { Badge } from "@/components/ui";
import { OwnerTabs } from "./owner-tabs";

export const metadata = { title: "Quản lý sân" };

export default async function VenueAdminLayout({ children, params }: { children: React.ReactNode; params: Promise<{ venueId: string }> }) {
  const { venueId } = await params;
  const user = await requireUser(`/chu-san/${venueId}`);
  const access = await getVenueAccess(venueId, user);
  if (!access) notFound();
  const v = access.venue;
  return (
    <div className="container-page py-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link href="/chu-san" className="muted">← Sân của tôi</Link>
          <h1 className="h1">{v.name}</h1>
          <div className="mt-1 flex gap-1.5">
            {v.status === "PENDING" && <Badge tone="amber">Chờ duyệt</Badge>}
            {v.status === "REJECTED" && <Badge tone="red">Bị từ chối</Badge>}
            {v.status === "APPROVED" && <Badge tone="green">Đang hiển thị</Badge>}
            <Badge tone={v.plan === "PRO" ? "blue" : "gray"}>Gói {v.plan === "PRO" ? "Pro" : "Miễn phí"}</Badge>
          </div>
        </div>
        <Link href={`/san/${v.slug}`} className="btn-secondary btn-sm">Xem trang công khai ↗</Link>
      </div>
      <OwnerTabs venueId={venueId} isOwner={access.isOwner} />
      {children}
    </div>
  );
}
