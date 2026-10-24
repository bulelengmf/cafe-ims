import Link from "next/link";
import { getDb } from "@/db/client";
import {
  Badge,
  EmptyState,
  Flash,
  Pagination,
  PageHeader,
  PrimaryLink,
  TableWrap,
  filterInput,
  first,
  td,
  th,
} from "@/components/ui";
import { trimDecimal } from "@/lib/format";
import { categoryOptions } from "@/server/master/categories";
import { type ItemStatusFilter, listItems } from "@/server/master/items";
import { parsePage } from "@/server/master/types";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

export default async function ItemsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = first(sp.q) ?? "";
  const kategori = first(sp.kategori) ?? "";
  const statusRaw = first(sp.status);
  const status: ItemStatusFilter =
    statusRaw === "all" || statusRaw === "inactive" ? statusRaw : "active";
  const page = parsePage(first(sp.hal));

  const db = getDb();
  const [list, cats] = await Promise.all([
    listItems(db, { q, categoryId: kategori, status, page }),
    categoryOptions(db),
  ]);
  const params: Record<string, string> = {};
  if (q) params.q = q;
  if (kategori) params.kategori = kategori;
  if (status !== "active") params.status = status;

  return (
    <>
      <PageHeader
        title="Barang"
        subtitle="Master barang: bahan baku, kemasan, barang habis pakai, dagangan, peralatan, dan aset."
        action={<PrimaryLink href="/barang/baru">Tambah barang</PrimaryLink>}
      />
      <Flash ok={first(sp.ok)} error={first(sp.e)} />

      <form method="get" className="mb-4 flex flex-wrap items-end gap-2" role="search">
        <div>
          <label htmlFor="q" className="mb-1 block text-xs font-medium text-slate-600">
            Cari nama / SKU
          </label>
          <input id="q" name="q" defaultValue={q} className={`${filterInput} w-56`} />
        </div>
        <div>
          <label htmlFor="kategori" className="mb-1 block text-xs font-medium text-slate-600">
            Kategori
          </label>
          <select id="kategori" name="kategori" defaultValue={kategori} className={filterInput}>
            <option value="">Semua</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} · {c.name}
              </option>
            ))}
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
          href="/barang"
          className="inline-flex min-h-[44px] items-center px-2 text-sm text-slate-600 underline"
        >
          Reset
        </Link>
      </form>

      {list.rows.length === 0 ? (
        <EmptyState>
          {q || kategori || status !== "active"
            ? "Tidak ada barang yang cocok dengan filter."
            : "Belum ada barang. Mulai dengan menambah barang pertama."}
        </EmptyState>
      ) : (
        <>
          <TableWrap>
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className={th}>SKU</th>
                  <th className={th}>Nama</th>
                  <th className={th}>Kategori</th>
                  <th className={th}>Satuan beli → pakai</th>
                  <th className={`${th} text-right`}>Stok min</th>
                  <th className={`${th} text-right`}>Pesan ulang</th>
                  <th className={th}>Status</th>
                  <th className={th}>
                    <span className="sr-only">Aksi</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.rows.map((r) => (
                  <tr key={r.id}>
                    <td className={`${td} font-mono text-xs`}>{r.sku}</td>
                    <td className={`${td} font-medium`}>{r.name}</td>
                    <td className={td}>
                      {r.categoryCode} <span className="text-slate-500">{r.categoryName}</span>
                    </td>
                    <td className={td}>
                      1 {r.purchaseUnit} = {trimDecimal(r.factor)} {r.usageUnit}
                    </td>
                    <td className={`${td} text-right tabular-nums`}>
                      {trimDecimal(r.minStockLevel)} {r.usageUnit}
                    </td>
                    <td className={`${td} text-right tabular-nums`}>
                      {trimDecimal(r.reorderPoint)} {r.usageUnit}
                    </td>
                    <td className={td}>
                      <Badge active={r.isActive} />
                    </td>
                    <td className={td}>
                      <Link
                        href={`/barang/${r.id}`}
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
            basePath="/barang"
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
