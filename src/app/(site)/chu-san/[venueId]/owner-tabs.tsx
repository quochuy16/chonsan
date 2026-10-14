"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function OwnerTabs({ venueId, isOwner }: { venueId: string; isOwner: boolean }) {
  const path = usePathname();
  const base = `/chu-san/${venueId}`;
  const items = [
    { href: base, label: "Lịch sân" },
    ...(isOwner ? [
      { href: `${base}/bang-gia`, label: "Bảng giá" },
      { href: `${base}/thong-ke`, label: "Thống kê" },
      { href: `${base}/cai-dat`, label: "Cài đặt" },
    ] : []),
  ];
  return (
    <div className="-mx-4 mb-5 flex gap-1 overflow-x-auto border-b border-gray-200 px-4">
      {items.map((t) => (
        <Link key={t.href} href={t.href}
          className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium ${path === t.href ? "border-brand-600 text-brand-700" : "border-transparent text-gray-500 hover:text-gray-800"}`}>
          {t.label}
        </Link>
      ))}
    </div>
  );
}
