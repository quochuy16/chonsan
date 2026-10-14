import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/server/db";
import { requireAdmin } from "@/lib/server/auth";
import { Flash } from "@/components/flash";
import { PROVINCES } from "@/lib/domain/locations";
import { pageFrom, totalPages } from "@/lib/domain/pagination";
import { vnDateKey } from "@/lib/domain/time";
import { ActionButton } from "../../_components/admin-form";
import { DataTable, PageHeader, Pager, Pill, btnDanger, btnDark, btnLight, currentUrl, filterInput } from "../../_components/ui";
import { setPlanAction, setVenueStatusAction, toggleVerifiedAction } from "../../actions";
import { ownerUrl } from "@/lib/server/urls";

export const metadata = { title: "Sân" };
type SP = { q?: string; status?: string; province?: string; plan?: string; page?: string; ok?: string; error?: string };
const STATUS = { PENDING: ["Chờ duyệt", "amber"], APPROVED: ["Đang hiển thị", "green"], REJECTED: ["Từ chối / ẩn", "red"] } as const;

export default async function VenuesAdmin({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdmin("/quan-tri/san");
  const sp = await searchParams;
  const { page, skip, take } = pageFrom(sp.page);
  const where: Prisma.VenueWhereInput = {
    ...(sp.q ? { OR: [{ name: { contains: sp.q } }, { address: { contains: sp.q } }, { owner: { name: { contains: sp.q } } }] } : {}),
    ...(sp.status && sp.status in STATUS ? { status: sp.status } : {}),
    ...(sp.province ? { province: sp.province } : {}),
    ...(sp.plan === "PRO" || sp.plan === "FREE" ? { plan: sp.plan } : {}),
  };
  const [total, venues] = await Promise.all([
    db.venue.count({ where }),
    db.venue.findMany({
      where, skip, take, orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: { owner: { select: { id: true, name: true, phone: true } }, _count: { select: { pitches: true, priceRules: true } } },
    }),
  ]);
  const back = currentUrl("/quan-tri/san", sp);
  return (
    <>
      <PageHeader title="Sân" desc="Duyệt sân mới, gắn xác minh, quản lý gói thu phí" />
      <Flash searchParams={sp} />
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q} placeholder="Tên sân, địa chỉ, chủ sân…" className={`${filterInput} min-w-56 flex-1`} aria-label="Tìm kiếm" />
        <select name="status" defaultValue={sp.status ?? ""} className={filterInput} aria-label="Trạng thái"><option value="">Mọi trạng thái</option>{Object.entries(STATUS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</select>
        <select name="province" defaultValue={sp.province ?? ""} className={filterInput} aria-label="Tỉnh thành"><option value="">Mọi tỉnh/thành</option>{PROVINCES.map((p) => <option key={p}>{p}</option>)}</select>
        <select name="plan" defaultValue={sp.plan ?? ""} className={filterInput} aria-label="Gói"><option value="">Mọi gói</option><option value="FREE">Miễn phí</option><option value="PRO">Pro</option></select>
        <button className={btnDark}>Lọc</button>
        <Link href="/quan-tri/san" className="self-center text-sm text-slate-500 hover:underline">Xóa lọc</Link>
      </form>
      <DataTable head={["Sân", "Chủ sân", "Khu vực", "Thiết lập", "Trạng thái", "Gói", "Thao tác"]} empty={venues.length === 0}>
        {venues.map((v) => {
          const [txt, tone] = STATUS[v.status as keyof typeof STATUS] ?? [v.status, "slate"];
          return (
            <tr key={v.id} className="align-top hover:bg-slate-50">
              <td className="px-3 py-2.5"><p className="font-medium text-slate-900">{v.name} {v.verified && <span title="Đã xác minh" className="text-emerald-600">✔</span>}</p><p className="text-xs text-slate-500">{v.address} · tạo {vnDateKey(v.createdAt)}</p></td>
              <td className="px-3 py-2.5"><Link href={`/quan-tri/nguoi-dung/${v.owner.id}`} className="hover:underline">{v.owner.name}</Link><p className="text-xs text-slate-500">{v.owner.phone}</p></td>
              <td className="px-3 py-2.5 whitespace-nowrap">{v.district}<p className="text-xs text-slate-500">{v.province}</p></td>
              <td className="px-3 py-2.5 text-xs whitespace-nowrap">{v._count.pitches} sân con<br />{v._count.priceRules ? `${v._count.priceRules} khung giá` : <span className="text-red-600">chưa có giá</span>}</td>
              <td className="px-3 py-2.5"><Pill tone={tone}>{txt}</Pill></td>
              <td className="px-3 py-2.5">{v.plan === "PRO" ? <Pill tone="blue">Pro</Pill> : <Pill>Miễn phí</Pill>}</td>
              <td className="px-3 py-2.5">
                <div className="flex flex-wrap gap-1">
                  {v.status !== "APPROVED" && <ActionButton action={setVenueStatusAction.bind(null, v.id, "APPROVED")} back={back} label="Duyệt" className={btnLight} />}
                  {v.status !== "REJECTED" && <ActionButton action={setVenueStatusAction.bind(null, v.id, "REJECTED")} back={back} label={v.status === "PENDING" ? "Từ chối" : "Ẩn sân"} className={btnDanger} confirm={`${v.status === "PENDING" ? "Từ chối" : "Ẩn"} ${v.name}?`} />}
                  <ActionButton action={toggleVerifiedAction.bind(null, v.id)} back={back} label={v.verified ? "Bỏ xác minh" : "Xác minh"} className={btnLight} />
                  <ActionButton action={setPlanAction.bind(null, v.id, v.plan === "PRO" ? "FREE" : "PRO")} back={back} label={v.plan === "PRO" ? "Về Miễn phí" : "Lên Pro"} className={btnLight} confirm={v.plan === "PRO" ? undefined : `Bật gói Pro cho ${v.name}? (Xác nhận chủ sân đã chuyển khoản)`} />
                  <Link href={`/san/${v.slug}`} target="_blank" className={btnLight}>Xem ↗</Link>
                  <a href={ownerUrl(`/chu-san/${v.id}`)} target="_blank" rel="noopener" className={btnLight}>Quản lý ↗</a>
                </div>
              </td>
            </tr>
          );
        })}
      </DataTable>
      <Pager base="/quan-tri/san" params={sp} page={page} pages={totalPages(total)} total={total} />
    </>
  );
}
