"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/barang", label: "Barang" },
  { href: "/pemasok", label: "Pemasok" },
  { href: "/kategori", label: "Kategori" },
  { href: "/satuan", label: "Satuan" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Menu utama"
      className="flex gap-1 overflow-x-auto p-2 md:flex-col md:overflow-visible md:p-3"
    >
      <p className="hidden px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-400 md:block">
        Master Data
      </p>
      {LINKS.map((l) => {
        const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-md px-3 py-2.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-emerald-700 ${
              active ? "bg-emerald-50 text-emerald-800" : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
