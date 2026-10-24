import { notFound } from "next/navigation";
import { getDb } from "@/db/client";
import { ConfirmButton } from "@/components/fields";
import { Badge, PageHeader } from "@/components/ui";
import { trimDecimal } from "@/lib/format";
import { categoryOptions } from "@/server/master/categories";
import { getItem } from "@/server/master/items";
import { unitOptions } from "@/server/master/units";
import { toggleItemAction } from "../actions";
import { ItemForm } from "../item-form";

export const dynamic = "force-dynamic";

export default async function EditItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const item = await getItem(db, id);
  if (!item) notFound();
  const [categories, units] = await Promise.all([
    categoryOptions(db, item.categoryId),
    unitOptions(db, [item.purchaseUnitId, item.usageUnitId]),
  ]);
  return (
    <>
      <PageHeader title={`Ubah barang: ${item.name}`} action={<Badge active={item.isActive} />} />
      <ItemForm
        categories={categories}
        units={units}
        initial={{
          id: item.id,
          sku: item.sku,
          name: item.name,
          description: item.description ?? "",
          categoryId: item.categoryId,
          purchaseUnitId: item.purchaseUnitId,
          usageUnitId: item.usageUnitId,
          purchaseToUsageFactor: trimDecimal(item.purchaseToUsageFactor),
          minStockLevel: trimDecimal(item.minStockLevel),
          reorderPoint: trimDecimal(item.reorderPoint),
          tracksExpiry: item.tracksExpiry,
          storageLocation: item.storageLocation ?? "",
        }}
      />
      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4 md:p-6">
        <h2 className="text-sm font-semibold text-slate-900">Status barang</h2>
        <p className="mt-1 text-sm text-slate-600">
          Barang tidak dihapus. Barang nonaktif tidak muncul di pilihan baru, tetapi datanya tetap
          tersimpan.
        </p>
        <form action={toggleItemAction} className="mt-3">
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="active" value={item.isActive ? "0" : "1"} />
          <ConfirmButton
            tone={item.isActive ? "danger" : "neutral"}
            message={item.isActive ? "Nonaktifkan barang ini?" : "Aktifkan kembali barang ini?"}
          >
            {item.isActive ? "Nonaktifkan barang" : "Aktifkan kembali"}
          </ConfirmButton>
        </form>
      </section>
    </>
  );
}
