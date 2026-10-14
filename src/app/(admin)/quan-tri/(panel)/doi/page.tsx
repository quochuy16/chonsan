import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/server/db";
import { requireAdmin } from "@/lib/server/auth";
import { Flash } from "@/components/flash";
import { Stars } from "@/components/ui";
import { LEVELS, label } from "@/lib/domain/constants";
import { pageFrom, totalPages } from "@/lib/domain/pagination";
import { computeReputation } from "@/lib/domain/reputation";
import { vnDateKey } from "@/lib/domain/time";
import { ActionButton } from "../../_components/admin-form";
import { DataTable, PageHeader, Pager, Pill, btnDark, btnLight, currentUrl, filterInput } from "../../_components/ui";
import { toggleTeamPublicAction } from "../../actions";

export const metadata = { title: "Đội bóng" };
type SP = { q?: string; page?: string; ok?: string; error?: string };

export default async function TeamsAdmin({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdmin("/quan-tri/doi");
  const sp = await searchParams;
  const { page, skip, take } = pageFrom(sp.page);
  const where: Prisma.TeamWhereInput = sp.q ? { OR: [{ name: { contains: sp.q } }, { district: { contains: sp.q } }] } : {};
  const [total, teams] = await Promise.all([
    db.team.count({ where }),
    db.team.findMany({
      where, skip, take, orderBy: { createdAt: "desc" },
      include: {
        ratingsReceived: true,
        members: { where: { active: true, role: "CAPTAIN" }, select: { displayName: true, userId: true } },
        _count: { select: { members: { where: { active: true } }, events: true, matchPosts: true } },
      },
    }),
  ]);
  const back = currentUrl("/quan-tri/doi", sp);
  return (
    <>
      <PageHeader title="Đội bóng" desc="Quỹ đội là dữ liệu riêng của từng đội — quản trị viên chỉ xem tổng quan, không sửa thu chi" />
      <Flash searchParams={sp} />
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q} placeholder="Tên đội, khu vực…" className={`${filterInput} min-w-56 flex-1`} aria-label="Tìm kiếm" />
        <button className={btnDark}>Tìm</button>
      </form>
      <DataTable head={["Đội", "Đội trưởng", "Khu vực", "Hoạt động", "Uy tín", "Hiển thị", ""]} empty={teams.length === 0}>
        {teams.map((t) => {
          const rep = computeReputation(t.ratingsReceived);
          return (
            <tr key={t.id} className="hover:bg-slate-50">
              <td className="px-3 py-2.5"><p className="font-medium">{t.name}</p><p className="text-xs text-slate-500">{label(LEVELS, t.level)} · tạo {vnDateKey(t.createdAt)}</p></td>
              <td className="px-3 py-2.5">{t.members.map((m) => m.userId ? <Link key={m.userId} href={`/quan-tri/nguoi-dung/${m.userId}`} className="block hover:underline">{m.displayName}</Link> : <span key={m.displayName}>{m.displayName}</span>)}</td>
              <td className="px-3 py-2.5 whitespace-nowrap">{t.district}<p className="text-xs text-slate-500">{t.province}</p></td>
              <td className="px-3 py-2.5 text-xs whitespace-nowrap">{t._count.members} thành viên<br />{t._count.events} buổi đá · {t._count.matchPosts} kèo</td>
              <td className="px-3 py-2.5 whitespace-nowrap"><Stars value={rep.score} count={rep.count} />{rep.noShows > 0 && <p><Pill tone="red">{rep.noShows} lần bùng</Pill></p>}</td>
              <td className="px-3 py-2.5">{t.isPublic ? <Pill tone="green">Công khai</Pill> : <Pill>Riêng tư</Pill>}</td>
              <td className="px-3 py-2.5 text-right whitespace-nowrap">
                <ActionButton action={toggleTeamPublicAction.bind(null, t.id)} back={back} label={t.isPublic ? "Ẩn trang đội" : "Hiện lại"} className={btnLight} confirm={t.isPublic ? `Ẩn trang công khai của ${t.name}?` : undefined} />{" "}
                <Link href={`/doi/${t.slug}`} target="_blank" className={btnLight}>Xem ↗</Link>
              </td>
            </tr>
          );
        })}
      </DataTable>
      <Pager base="/quan-tri/doi" params={sp} page={page} pages={totalPages(total)} total={total} />
    </>
  );
}
