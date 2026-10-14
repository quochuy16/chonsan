import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/server/db";
import { requireAdmin } from "@/lib/server/auth";
import { Flash } from "@/components/flash";
import { pageFrom, totalPages } from "@/lib/domain/pagination";
import { vnDateKey } from "@/lib/domain/time";
import { ActionButton } from "../../_components/admin-form";
import { DataTable, PageHeader, Pager, Pill, btnDanger, btnDark, btnLight, currentUrl, filterInput } from "../../_components/ui";
import { setUserBannedAction } from "../../actions";

export const metadata = { title: "Người dùng" };
type SP = { q?: string; role?: string; status?: string; login?: string; page?: string; ok?: string; error?: string };

export default async function UsersPage({ searchParams }: { searchParams: Promise<SP> }) {
  const admin = await requireAdmin("/quan-tri/nguoi-dung");
  const sp = await searchParams;
  const { page, skip, take } = pageFrom(sp.page);
  const where: Prisma.UserWhereInput = {
    ...(sp.q ? { OR: [{ name: { contains: sp.q } }, { email: { contains: sp.q.toLowerCase() } }, { phone: { contains: sp.q } }] } : {}),
    ...(sp.role === "ADMIN" || sp.role === "USER" ? { role: sp.role } : {}),
    ...(sp.status === "banned" ? { banned: true } : sp.status === "active" ? { banned: false } : {}),
    ...(sp.login === "google" ? { googleId: { not: null } } : sp.login === "password" ? { googleId: null } : {}),
  };
  const [total, users] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({ where, orderBy: { createdAt: "desc" }, skip, take, include: { _count: { select: { bookings: true, venues: true, matchPosts: true } } } }),
  ]);
  const back = currentUrl("/quan-tri/nguoi-dung", sp);
  return (
    <>
      <PageHeader title="Người dùng" desc="Tìm theo tên, email hoặc số điện thoại" />
      <Flash searchParams={sp} />
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q} placeholder="Tên, email, SĐT…" className={`${filterInput} min-w-56 flex-1`} aria-label="Tìm kiếm" />
        <select name="role" defaultValue={sp.role ?? ""} className={filterInput} aria-label="Vai trò"><option value="">Mọi vai trò</option><option value="USER">Người dùng</option><option value="ADMIN">Quản trị viên</option></select>
        <select name="status" defaultValue={sp.status ?? ""} className={filterInput} aria-label="Trạng thái"><option value="">Mọi trạng thái</option><option value="active">Đang hoạt động</option><option value="banned">Bị khóa</option></select>
        <select name="login" defaultValue={sp.login ?? ""} className={filterInput} aria-label="Cách đăng nhập"><option value="">Mọi cách đăng nhập</option><option value="google">Google</option><option value="password">Email + mật khẩu</option></select>
        <button className={btnDark}>Lọc</button>
        <Link href="/quan-tri/nguoi-dung" className="self-center text-sm text-slate-500 hover:underline">Xóa lọc</Link>
      </form>
      <DataTable head={["Người dùng", "SĐT", "Đăng nhập", "Hoạt động", "Ngày tạo", "Trạng thái", ""]} empty={users.length === 0}>
        {users.map((u) => (
          <tr key={u.id} className="hover:bg-slate-50">
            <td className="px-3 py-2.5"><Link href={`/quan-tri/nguoi-dung/${u.id}`} className="font-medium text-slate-900 hover:underline">{u.name}</Link>{u.role === "ADMIN" && <> <Pill tone="amber">Admin</Pill></>}<p className="text-xs text-slate-500">{u.email}</p></td>
            <td className="px-3 py-2.5 whitespace-nowrap">{u.phone || <span className="text-slate-400">—</span>}</td>
            <td className="px-3 py-2.5">{u.googleId ? <Pill tone="blue">Google</Pill> : null} {u.passwordHash ? <Pill>Mật khẩu</Pill> : null}</td>
            <td className="px-3 py-2.5 text-xs whitespace-nowrap text-slate-600">{u._count.bookings} đơn · {u._count.matchPosts} kèo · {u._count.venues} sân</td>
            <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">{vnDateKey(u.createdAt)}</td>
            <td className="px-3 py-2.5">{u.banned ? <Pill tone="red">Bị khóa</Pill> : <Pill tone="green">Hoạt động</Pill>}</td>
            <td className="px-3 py-2.5 text-right whitespace-nowrap">
              <Link href={`/quan-tri/nguoi-dung/${u.id}`} className={btnLight}>Chi tiết</Link>{" "}
              {u.id !== admin.id && (u.banned
                ? <ActionButton action={setUserBannedAction.bind(null, u.id, false)} back={back} label="Mở khóa" className={btnLight} />
                : <ActionButton action={setUserBannedAction.bind(null, u.id, true)} back={back} label="Khóa" className={btnDanger} confirm={`Khóa tài khoản ${u.name}? Người này sẽ bị đăng xuất và không đăng nhập được.`} />)}
            </td>
          </tr>
        ))}
      </DataTable>
      <Pager base="/quan-tri/nguoi-dung" params={sp} page={page} pages={totalPages(total)} total={total} />
    </>
  );
}
