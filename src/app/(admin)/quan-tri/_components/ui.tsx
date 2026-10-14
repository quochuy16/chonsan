import Link from "next/link";

export function PageHeader({ title, desc, children }: { title: string; desc?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {desc && <p className="mt-0.5 text-sm text-slate-500">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

export function Panel({ title, children, action }: { title?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      {title && (
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="font-semibold text-slate-800">{title}</h2>
          {action}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Metric({ label, value, hint, href }: { label: string; value: React.ReactNode; hint?: string; href?: string }) {
  const body = (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300">
      <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

type Tone = "slate" | "green" | "amber" | "red" | "blue";
const TONES: Record<Tone, string> = {
  slate: "bg-slate-100 text-slate-700",
  green: "bg-emerald-100 text-emerald-800",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-700",
  blue: "bg-sky-100 text-sky-800",
};
export function Pill({ children, tone = "slate" }: { children: React.ReactNode; tone?: Tone }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TONES[tone]}`}>{children}</span>;
}

/** Bảng có cuộn ngang trên màn hình nhỏ */
export function DataTable({ head, children, empty }: { head: string[]; children: React.ReactNode; empty?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
          <tr>{head.map((h, i) => <th key={i} className="px-3 py-2.5 font-semibold whitespace-nowrap">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
      {empty && <p className="px-4 py-10 text-center text-sm text-slate-500">Không có dữ liệu phù hợp.</p>}
    </div>
  );
}

/** Phân trang giữ nguyên bộ lọc hiện tại */
export function Pager({ base, params, page, pages, total }: { base: string; params: Record<string, string | undefined>; page: number; pages: number; total: number }) {
  const href = (p: number) => {
    const q = new URLSearchParams(Object.entries(params).filter(([k, v]) => v && k !== "page" && k !== "ok" && k !== "error") as [string, string][]);
    if (p > 1) q.set("page", String(p));
    const s = q.toString();
    return s ? `${base}?${s}` : base;
  };
  return (
    <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
      <span>{total} kết quả · trang {page}/{pages}</span>
      <div className="flex gap-1">
        {page > 1 ? <Link className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 hover:bg-slate-50" href={href(page - 1)}>‹ Trước</Link> : null}
        {page < pages ? <Link className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 hover:bg-slate-50" href={href(page + 1)}>Sau ›</Link> : null}
      </div>
    </div>
  );
}

/** URL hiện tại (kèm bộ lọc) để thao tác xong quay lại đúng chỗ */
export function currentUrl(base: string, params: Record<string, string | undefined>) {
  const q = new URLSearchParams(Object.entries(params).filter(([k, v]) => v && k !== "ok" && k !== "error") as [string, string][]).toString();
  return q ? `${base}?${q}` : base;
}

export const filterInput = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500";
export const btnDark = "inline-flex items-center justify-center rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50";
export const btnLight = "inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50";
export const btnDanger = "inline-flex items-center justify-center rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50";
