import Link from "next/link";
import { getDb } from "@/db/client";
import { Badge, Flash, PageHeader, PrimaryLink, TableWrap, first, td, th } from "@/components/ui";
import { ConfirmButton } from "@/components/fields";
import { TREATMENT_LABELS } from "@/lib/labels";
import { listCategories } from "@/server/master/categories";
import { toggleCategoryAction } from "./actions";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

export default async function CategoriesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const rows = await listCategories(getDb());
  return (
    <>
      <PageHeader
        title="Kategori"
        subtitle="Kategori menentukan perlakuan pencatatan barang. Kategori dapat ditambah tanpa mengubah sistem."
        action={<PrimaryLink href="/kategori/baru">Tambah kategori</PrimaryLink>}
      />
      <Flash ok={first(sp.ok)} error={first(sp.e)} />
      <TableWrap>
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className={th}>Kode</th>
              <th className={th}>Nama</th>
              <th className={th}>Perlakuan</th>
              <th className={th}>Stok dicatat</th>
              <th className={`${th} text-right`}>Barang aktif</th>
              <th className={th}>Status</th>
              <th className={th}>
                <span className="sr-only">Aksi</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((c) => (
              <tr key={c.id}>
                <td className={`${td} font-mono text-xs`}>{c.code}</td>
                <td className={`${td} font-medium`}>{c.name}</td>
                <td className={td}>{TREATMENT_LABELS[c.treatment] ?? c.treatment}</td>
                <td className={td}>{c.tracksStock ? "Ya" : "Tidak"}</td>
                <td className={`${td} text-right tabular-nums`}>{c.activeItemCount}</td>
                <td className={td}>
                  <Badge active={c.isActive} />
                </td>
                <td className={td}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/kategori/${c.id}`}
                      className="inline-flex min-h-[44px] items-center text-sm font-medium text-emerald-800 underline"
                    >
                      Ubah
                    </Link>
                    <form action={toggleCategoryAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="active" value={c.isActive ? "0" : "1"} />
                      <ConfirmButton
                        message={
                          c.isActive
                            ? `Nonaktifkan kategori ${c.code}?`
                            : `Aktifkan kembali kategori ${c.code}?`
                        }
                      >
                        {c.isActive ? "Nonaktifkan" : "Aktifkan"}
                      </ConfirmButton>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
    </>
  );
}
