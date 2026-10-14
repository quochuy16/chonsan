import Link from "next/link";
import { db } from "@/lib/server/db";
import { requireAdmin } from "@/lib/server/auth";
import { Flash } from "@/components/flash";
import { Tabs } from "@/components/ui";
import { formatVND } from "@/lib/domain/money";
import { pageFrom, totalPages } from "@/lib/domain/pagination";
import { formatDateTime } from "@/lib/domain/time";
import { ActionButton } from "../../_components/admin-form";
import { DataTable, PageHeader, Pager, Pill, btnDanger, btnDark, btnLight, currentUrl, filterInput } from "../../_components/ui";
import { setPostHiddenAction } from "../../actions";

export const metadata = { title: "Kèo" };
type SP = { tab?: string; q?: string; status?: string; page?: string; ok?: string; error?: string };
const STATUS: Record<string, [string, "green" | "blue" | "slate" | "red" | "amber"]> = {
  OPEN: ["Đang mở", "green"], MATCHED: ["Đã chốt", "blue"], FULL: ["Đủ người", "blue"], CANCELLED: ["Đã hủy", "slate"], HIDDEN: ["Bị ẩn", "red"],
};

export default async function PostsAdmin({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdmin("/quan-tri/keo");
  const sp = await searchParams;
  const tab = sp.tab === "nguoi" ? "nguoi" : "doi";
  const { page, skip, take } = pageFrom(sp.page);
  const status = sp.status && sp.status in STATUS ? { status: sp.status } : {};
  const q = sp.q ? { OR: [{ note: { contains: sp.q } }, { venueText: { contains: sp.q } }, { district: { contains: sp.q } }] } : {};
  const back = currentUrl("/quan-tri/keo", sp);
  const tabHref = (t: string) => `/quan-tri/keo?tab=${t}`;

  const [total, rows] = tab === "doi"
    ? await Promise.all([
        db.matchPost.count({ where: { ...status, ...q } }),
        db.matchPost.findMany({ where: { ...status, ...q }, skip, take, orderBy: { createdAt: "desc" }, include: { author: { select: { id: true, name: true } }, _count: { select: { requests: true } } } }),
      ]).then(([t, r]) => [t, r.map((p) => ({ id: p.id, kind: "MATCH" as const, href: `/keo/${p.id}`, title: `${p.teamName} tìm đối sân ${p.pitchSize}`, extra: `${p._count.requests} đội hỏi`, author: p.author, start: p.start, venueText: p.venueText, district: p.district, note: p.note, status: p.status }))] as const)
    : await Promise.all([
        db.playerPost.count({ where: { ...status, ...q } }),
        db.playerPost.findMany({ where: { ...status, ...q }, skip, take, orderBy: { createdAt: "desc" }, include: { author: { select: { id: true, name: true } }, _count: { select: { requests: true } } } }),
      ]).then(([t, r]) => [t, r.map((p) => ({ id: p.id, kind: "PLAYER" as const, href: `/keo/nguoi/${p.id}`, title: `Cần ${p.needed} người${p.position ? ` (${p.position})` : ""}`, extra: `${p.feePerPerson ? formatVND(p.feePerPerson) + "/người · " : ""}${p._count.requests} người xin`, author: p.author, start: p.start, venueText: p.venueText, district: p.district, note: p.note, status: p.status }))] as const);

  return (
    <>
      <PageHeader title="Kèo" desc="Ẩn bài vi phạm (cá cược, lừa đảo…). Người đăng sẽ nhận thông báo." />
      <Flash searchParams={sp} />
      <Tabs active={tab} items={[{ key: "doi", label: "Tìm đối", href: tabHref("doi") }, { key: "nguoi", label: "Tìm người đá ghép", href: tabHref("nguoi") }]} />
      <form className="mb-4 flex flex-wrap gap-2">
        <input type="hidden" name="tab" value={tab} />
        <input name="q" defaultValue={sp.q} placeholder="Nội dung, sân, khu vực…" className={`${filterInput} min-w-56 flex-1`} aria-label="Tìm kiếm" />
        <select name="status" defaultValue={sp.status ?? ""} className={filterInput} aria-label="Trạng thái"><option value="">Mọi trạng thái</option>{Object.entries(STATUS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</select>
        <button className={btnDark}>Lọc</button>
      </form>
      <DataTable head={["Bài đăng", "Người đăng", "Thời gian đá", "Nội dung", "Trạng thái", ""]} empty={rows.length === 0}>
        {rows.map((p) => {
          const [txt, tone] = STATUS[p.status] ?? [p.status, "slate"];
          return (
            <tr key={p.id} className="align-top hover:bg-slate-50">
              <td className="px-3 py-2.5"><p className="font-medium">{p.title}</p><p className="text-xs text-slate-500">{p.extra}</p></td>
              <td className="px-3 py-2.5"><Link href={`/quan-tri/nguoi-dung/${p.author.id}`} className="hover:underline">{p.author.name}</Link></td>
              <td className="px-3 py-2.5 whitespace-nowrap">{formatDateTime(p.start)}<p className="text-xs text-slate-500">{p.venueText} · {p.district}</p></td>
              <td className="max-w-xs px-3 py-2.5 text-xs text-slate-600">{p.note || "—"}</td>
              <td className="px-3 py-2.5"><Pill tone={tone}>{txt}</Pill></td>
              <td className="px-3 py-2.5 text-right whitespace-nowrap">
                {p.status === "HIDDEN"
                  ? <ActionButton action={setPostHiddenAction.bind(null, p.kind, p.id, false)} back={back} label="Hiện lại" className={btnLight} />
                  : <ActionButton action={setPostHiddenAction.bind(null, p.kind, p.id, true)} back={back} label="Ẩn bài" className={btnDanger} confirm="Ẩn bài này? Người đăng sẽ nhận thông báo." />}{" "}
                <Link href={p.href} target="_blank" className={btnLight}>Xem ↗</Link>
              </td>
            </tr>
          );
        })}
      </DataTable>
      <Pager base="/quan-tri/keo" params={sp} page={page} pages={totalPages(total)} total={total} />
    </>
  );
}
