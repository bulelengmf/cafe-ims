import Link from "next/link";
import { getDb } from "@/db/client";
import {
  Badge,
  EmptyState,
  Flash,
  PageHeader,
  Pagination,
  PrimaryLink,
  TableWrap,
  filterInput,
  first,
  td,
  th,
} from "@/components/ui";
import { SUPPLIER_TYPE_LABELS } from "@/lib/labels";
import { listSuppliers } from "@/server/master/suppliers";
import { parsePage } from "@/server/master/types";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

export default async function SuppliersPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = first(sp.q) ?? "";
  const typeRaw = first(sp.jenis);
  const type = typeRaw === "formal" || typeRaw === "market" ? typeRaw : undefined;
  const statusRaw = first(sp.status);
  const status = statusRaw === "all" || statusRaw === "inactive" ? statusRaw : "active";
  const page = parsePage(first(sp.hal));
  const list = await listSuppliers(getDb(), { q, type, status, page });

  const params: Record<string, string> = {};
  if (q) params.q = q;
  if (type) params.jenis = type;
  if (status !== "active") params.status = status;

  return (
    <>
      <PageHeader
        title="Pemasok"
        subtitle="Pemasok formal dan penjual di pasar."
        action={<PrimaryLink href="/pemasok/baru">Tambah pemasok</PrimaryLink>}
      />
      <Flash ok={first(sp.ok)} error={first(sp.e)} />
      <form method="get" className="mb-4 flex flex-wrap items-end gap-2" role="search">
        <div>
          <label htmlFor="q" className="mb-1 block text-xs font-medium text-slate-600">
            Cari nama / kontak / telepon
          </label>
          <input id="q" name="q" defaultValue={q} className={`${filterInput} w-64`} />
        </div>
        <div>
          <label htmlFor="jenis" className="mb-1 block text-xs font-medium text-slate-600">
            Jenis
          </label>
          <select id="jenis" name="jenis" defaultValue={type ?? ""} className={filterInput}>
            <option value="">Semua</option>
            <option value="formal">Formal</option>
            <option value="market">Pasar</option>
          </select>
        </div>
        <div>
          <label htmlFor="status" className="mb-1 block text-xs font-medium text-slate-600">
            Status
          </label>
          <select id="status" name="status" defaultValue={status} className={filterInput}>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
            <option value="all">Semua</option>
          </select>
        </div>
        <button
          type="submit"
          className="min-h-[44px] rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Terapkan
        </button>
        <Link
          href="/pemasok"
          className="inline-flex min-h-[44px] items-center px-2 text-sm text-slate-600 underline"
        >
          Reset
        </Link>
      </form>
      {list.rows.length === 0 ? (
        <EmptyState>
          {q || type || status !== "active"
            ? "Tidak ada pemasok yang cocok dengan filter."
            : "Belum ada pemasok. Tambahkan pemasok pertama."}
        </EmptyState>
      ) : (
        <>
          <TableWrap>
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className={th}>Nama</th>
                  <th className={th}>Jenis</th>
                  <th className={th}>Kontak</th>
                  <th className={th}>Termin</th>
                  <th className={`${th} text-right`}>Lead time</th>
                  <th className={th}>Status</th>
                  <th className={th}>
                    <span className="sr-only">Aksi</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.rows.map((s) => (
                  <tr key={s.id}>
                    <td className={`${td} font-medium`}>{s.name}</td>
                    <td className={td}>{SUPPLIER_TYPE_LABELS[s.type] ?? s.type}</td>
                    <td className={td}>
                      {[s.contactPerson, s.phone].filter(Boolean).join(" · ") || "-"}
                    </td>
                    <td className={td}>{s.paymentTerms ?? "-"}</td>
                    <td className={`${td} text-right tabular-nums`}>
                      {s.leadTimeDays === null ? "-" : `${s.leadTimeDays} hari`}
                    </td>
                    <td className={td}>
                      <Badge active={s.isActive} />
                    </td>
                    <td className={td}>
                      <Link
                        href={`/pemasok/${s.id}`}
                        className="inline-flex min-h-[44px] items-center text-sm font-medium text-emerald-800 underline"
                      >
                        Ubah
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
          <Pagination
            basePath="/pemasok"
            params={params}
            page={list.page}
            pageCount={list.pageCount}
            total={list.total}
          />
        </>
      )}
    </>
  );
}
