import { getDb } from "@/db/client";
import { PageHeader } from "@/components/ui";
import { categoryOptions } from "@/server/master/categories";
import { unitOptions } from "@/server/master/units";
import { ItemForm } from "../item-form";

export const dynamic = "force-dynamic";

export default async function NewItemPage() {
  const db = getDb();
  const [categories, units] = await Promise.all([categoryOptions(db), unitOptions(db)]);
  return (
    <>
      <PageHeader title="Tambah barang" />
      <ItemForm categories={categories} units={units} />
    </>
  );
}
