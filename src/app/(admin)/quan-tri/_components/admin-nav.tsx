"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem {
  href: string;
  label: string;
  icon: string;
  badge?: number;
}

export function AdminNav({ items }: { items: NavItem[] }) {
  const path = usePathname();
  const isActive = (href: string) => (href === "/quan-tri" ? path === href : path.startsWith(href));
  return (
    <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible lg:pb-0">
      {items.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
            isActive(it.href) ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
          }`}
        >
          <span className="text-base leading-none">{it.icon}</span>
          <span>{it.label}</span>
          {!!it.badge && <span className="ml-auto rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-slate-900">{it.badge}</span>}
        </Link>
      ))}
    </nav>
  );
}
