import Link from "next/link";
import { db } from "@/lib/server/db";
import { requireAdmin } from "@/lib/server/auth";
import { Flash } from "@/components/flash";
import { Tabs } from "@/components/ui";
import { REPORT_REASONS, label } from "@/lib/domain/constants";
import { pageFrom, totalPages } from "@/lib/domain/pagination";
import { formatDateTime } from "@/lib/domain/time";
import { ActionButton } from "../../_components/admin-form";
import { PageHeader, Pager, Pill, btnDanger, btnLight, currentUrl } from "../../_components/ui";
import { resolveReportAction } from "../../actions";

export const metadata = { title: "Báo cáo vi phạm" };
type SP = { tab?: string; page?: string; ok?: string; error?: string };
const TARGET: Record<string, { label: string; link?: (id: string) => string }> = {
  MATCH_POST: { label: "Bài tìm đối", link: (id) => `/keo/${id}` },
  PLAYER_POST: { label: "Bài tìm người", link: (id) => `/keo/nguoi/${id}` },
  VENUE: { label: "Sân" },
  TEAM: { label: "Đội" },
  USER: { label: "Người dùng", link: (id) => `/quan-tri/nguoi-dung/${id}` },
};

export default async function ReportsAdmin({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdmin("/quan-tri/bao-cao");
  const sp = await searchParams;
  const tab = sp.tab === "da-xu-ly" ? "da-xu-ly" : "cho";
  const where = tab === "cho" ? { status: "OPEN" } : { status: { in: ["RESOLVED", "DISMISSED"] } };
  const { page, skip, take } = pageFrom(sp.page);
  const [total, reports] = await Promise.all([
    db.report.count({ where }),
    db.report.findMany({ where, skip, take, orderBy: { createdAt: tab === "cho" ? "asc" : "desc" }, include: { reporter: { select: { id: true, name: true } } } }),
  ]);
  const venueIds = reports.filter((r) => r.targetType === "VENUE").map((r) => r.targetId);
  const venues = venueIds.length ? await db.venue.findMany({ where: { id: { in: venueIds } }, select: { id: true, slug: true, name: true } }) : [];
  const back = currentUrl("/quan-tri/bao-cao", sp);
  const targetLink = (type: string, id: string) => (type === "VENUE" ? (venues.find((v) => v.id === id) ? `/san/${venues.find((v) => v.id === id)!.slug}` : undefined) : TARGET[type]?.link?.(id));
  return (
    <>
      <PageHeader title="Báo cáo vi phạm" desc="Bỏ qua · Ẩn nội dung · Khóa tài khoản người đăng" />
      <Flash searchParams={sp} />
      <Tabs active={tab} items={[{ key: "cho", label: "Chờ xử lý", href: "/quan-tri/bao-cao" }, { key: "da-xu-ly", label: "Đã xử lý", href: "/quan-tri/bao-cao?tab=da-xu-ly" }]} />
      {reports.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 bg-white py-10 text-center text-sm text-slate-500">Không có báo cáo.</p> : (
        <div className="space-y-3">
          {reports.map((r) => {
            const link = targetLink(r.targetType, r.targetId);
            return (
              <div key={r.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2">
                    <Pill tone={r.reason === "BETTING" ? "red" : "amber"}>{label(REPORT_REASONS, r.reason)}</Pill>
                    <span className="text-sm font-medium">{TARGET[r.targetType]?.label ?? r.targetType}</span>
                    {link && <Link href={link} target="_blank" className="text-sm text-sky-700 hover:underline">Xem nội dung ↗</Link>}
                    {r.status !== "OPEN" && <Pill tone={r.status === "RESOLVED" ? "green" : "slate"}>{r.status === "RESOLVED" ? "Đã xử lý" : "Đã bỏ qua"}</Pill>}
                  </p>
                  {r.detail && <p className="mt-1 text-sm text-slate-700">“{r.detail}”</p>}
                  <p className="mt-1 text-xs text-slate-500">Báo cáo bởi <Link href={`/quan-tri/nguoi-dung/${r.reporter.id}`} className="hover:underline">{r.reporter.name}</Link> · {formatDateTime(r.createdAt)}</p>
                </div>
                {r.status === "OPEN" && (
                  <div className="flex flex-wrap gap-1">
                    <ActionButton action={resolveReportAction.bind(null, r.id, "DISMISS")} back={back} label="Bỏ qua" className={btnLight} />
                    <ActionButton action={resolveReportAction.bind(null, r.id, "HIDE")} back={back} label="Ẩn nội dung" className={btnLight} confirm="Ẩn nội dung bị báo cáo?" />
                    <ActionButton action={resolveReportAction.bind(null, r.id, "BAN")} back={back} label="Khóa người đăng" className={btnDanger} confirm="Khóa tài khoản người đăng nội dung này?" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <Pager base="/quan-tri/bao-cao" params={sp} page={page} pages={totalPages(total)} total={total} />
    </>
  );
}
