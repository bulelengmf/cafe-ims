import Link from "next/link";
import type { ReactNode } from "react";
import { FLASH_ERROR, FLASH_OK } from "../lib/labels";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function PrimaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-[44px] items-center rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
    >
      {children}
    </Link>
  );
}

export function Flash({ ok, error }: { ok?: string; error?: string }) {
  const okMsg = ok ? FLASH_OK[ok] : undefined;
  const errMsg = error ? FLASH_ERROR[error] : undefined;
  if (!okMsg && !errMsg) return null;
  return (
    <div
      role={errMsg ? "alert" : "status"}
      className={`mb-4 rounded-md border p-3 text-sm ${
        errMsg
          ? "border-red-300 bg-red-50 text-red-800"
          : "border-emerald-300 bg-emerald-50 text-emerald-900"
      }`}
    >
      {errMsg ?? okMsg}
    </div>
  );
}

export function Badge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
        active ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
      }`}
    >
      {active ? "Aktif" : "Nonaktif"}
    </span>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
      {children}
    </div>
  );
}

export function TableWrap({ children }: { children: ReactNode }) {
  return (
    <div className="relative overflow-x-auto rounded-lg border border-slate-200 bg-white">
      {children}
    </div>
  );
}

export const th =
  "px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500";
export const td = "px-3 py-2.5 text-sm text-slate-800 align-top";

export function Pagination({
  basePath,
  params,
  page,
  pageCount,
  total,
}: {
  basePath: string;
  params: Record<string, string>;
  page: number;
  pageCount: number;
  total: number;
}) {
  const href = (p: number) => {
    const qs = new URLSearchParams({ ...params, hal: String(p) });
    return `${basePath}?${qs.toString()}`;
  };
  const linkCls =
    "inline-flex min-h-[44px] items-center rounded-md border border-slate-300 bg-white px-4 text-sm text-slate-700 hover:bg-slate-100";
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
      <span>
        {total} data · halaman {page} dari {pageCount}
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <Link href={href(page - 1)} className={linkCls}>
            Sebelumnya
          </Link>
        )}
        {page < pageCount && (
          <Link href={href(page + 1)} className={linkCls}>
            Berikutnya
          </Link>
        )}
      </div>
    </div>
  );
}

export const filterInput =
  "min-h-[44px] rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-emerald-600";

export function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}
