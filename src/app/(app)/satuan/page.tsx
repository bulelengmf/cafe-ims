import Link from "next/link";
import { getDb } from "@/db/client";
import { Badge, Flash, PageHeader, PrimaryLink, TableWrap, first, td, th } from "@/components/ui";
import { ConfirmButton } from "@/components/fields";
import { DIMENSION_LABELS } from "@/lib/labels";
import { listUnits } from "@/server/master/units";
import { toggleUnitAction } from "./actions";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

export default async function UnitsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const rows = await listUnits(getDb());
  return (
    <>
      <PageHeader
        title="Satuan"
        subtitle="Satuan beli dan satuan pakai. Kode dan dimensi tidak dapat diubah setelah dibuat."
        action={<PrimaryLink href="/satuan/baru">Tambah satuan</PrimaryLink>}
      />
      <Flash ok={first(sp.ok)} error={first(sp.e)} />
      <TableWrap>
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className={th}>Kode</th>
              <th className={th}>Nama</th>
              <th className={th}>Dimensi</th>
              <th className={`${th} text-right`}>Barang aktif</th>
              <th className={th}>Status</th>
              <th className={th}>
                <span className="sr-only">Aksi</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((u) => (
              <tr key={u.id}>
                <td className={`${td} font-mono text-xs`}>{u.code}</td>
                <td className={`${td} font-medium`}>{u.name}</td>
                <td className={td}>{DIMENSION_LABELS[u.dimension] ?? u.dimension}</td>
                <td className={`${td} text-right tabular-nums`}>{u.activeItemCount}</td>
                <td className={td}>
                  <Badge active={u.isActive} />
                </td>
                <td className={td}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/satuan/${u.id}`}
                      className="inline-flex min-h-[44px] items-center text-sm font-medium text-emerald-800 underline"
                    >
                      Ubah
                    </Link>
                    <form action={toggleUnitAction}>
                      <input type="hidden" name="id" value={u.id} />
                      <input type="hidden" name="active" value={u.isActive ? "0" : "1"} />
                      <ConfirmButton
                        message={
                          u.isActive
                            ? `Nonaktifkan satuan ${u.code}?`
                            : `Aktifkan kembali satuan ${u.code}?`
                        }
                      >
                        {u.isActive ? "Nonaktifkan" : "Aktifkan"}
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
