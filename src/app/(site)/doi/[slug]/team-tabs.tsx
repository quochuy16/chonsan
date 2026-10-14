"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function TeamTabs({ slug, isMember, isCaptain }: { slug: string; isMember: boolean; isCaptain: boolean }) {
  const path = usePathname();
  const base = `/doi/${slug}`;
  const items = [
    { href: base, label: "Tổng quan" },
    ...(isMember ? [{ href: `${base}/lich`, label: "Lịch đá" }, { href: `${base}/quy`, label: "Quỹ đội" }, { href: `${base}/thong-ke`, label: "Thống kê" }] : []),
    ...(isCaptain ? [{ href: `${base}/quan-ly`, label: "Quản lý" }] : []),
  ];
  return (
    <div className="-mx-4 mb-5 flex gap-1 overflow-x-auto border-b border-gray-200 px-4">
      {items.map((t) => (
        <Link key={t.href} href={t.href} className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium ${path === t.href ? "border-brand-600 text-brand-700" : "border-transparent text-gray-500 hover:text-gray-800"}`}>{t.label}</Link>
      ))}
    </div>
  );
}
