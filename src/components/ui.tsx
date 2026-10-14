import Link from "next/link";
import { BOOKING_STATUS, label } from "@/lib/domain/constants";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-brand-100 text-brand-800",
  COMPLETED: "bg-gray-100 text-gray-700",
  CANCELLED: "bg-gray-100 text-gray-400 line-through",
  NO_SHOW: "bg-red-100 text-red-700",
  BLOCKED: "bg-slate-200 text-slate-700",
};

export function BookingStatusBadge({ status }: { status: string }) {
  return <span className={`badge ${STATUS_COLORS[status] ?? "bg-gray-100"}`}>{label(BOOKING_STATUS, status)}</span>;
}

type Tone = "gray" | "green" | "amber" | "red" | "blue";
const TONES: Record<Tone, string> = {
  gray: "bg-gray-100 text-gray-700",
  green: "bg-brand-100 text-brand-800",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-700",
  blue: "bg-sky-100 text-sky-800",
};

export function Badge({ children, tone = "gray" }: { children: React.ReactNode; tone?: Tone }) {
  return <span className={`badge ${TONES[tone]}`}>{children}</span>;
}

export function Stars({ value, count }: { value: number | null; count?: number }) {
  if (value === null) return <span className="text-xs text-gray-400">Chưa có đánh giá</span>;
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <span className="text-amber-500">★</span>
      <span className="font-semibold">{value.toFixed(1).replace(".", ",")}</span>
      {count !== undefined && <span className="text-gray-400">({count})</span>}
    </span>
  );
}

export function Empty({
  title,
  children,
  action,
}: {
  title: string;
  children?: React.ReactNode;
  action?: { href: string; label: string };
}) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center">
      <p className="font-semibold text-gray-800">{title}</p>
      {children && <div className="muted mt-1">{children}</div>}
      {action && (
        <Link href={action.href} className="btn-primary mt-4">
          {action.label}
        </Link>
      )}
    </div>
  );
}

export function StatCard({ label: l, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="card">
      <p className="muted">{l}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

export function Tabs({ items, active }: { items: { href: string; label: string; key: string }[]; active: string }) {
  return (
    <div className="-mx-4 mb-5 flex gap-1 overflow-x-auto border-b border-gray-200 px-4">
      {items.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium ${
            t.key === active ? "border-brand-600 text-brand-700" : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}

/** Biểu đồ thanh ngang đơn giản */
export function BarList({ rows, format }: { rows: { label: string; value: number }[]; format: (n: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.label} className="text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">{r.label}</span>
            <span className="font-medium tabular-nums">{format(r.value)}</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-gray-100">
            <div className="h-2 rounded-full bg-brand-500" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
