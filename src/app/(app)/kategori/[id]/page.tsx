import { notFound } from "next/navigation";
import { getDb } from "@/db/client";
import { Badge, PageHeader } from "@/components/ui";
import { getCategory } from "@/server/master/categories";
import { CategoryForm } from "../category-form";

export const dynamic = "force-dynamic";

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await getCategory(getDb(), id);
  if (!c) notFound();
  return (
    <>
      <PageHeader title={`Ubah kategori: ${c.code}`} action={<Badge active={c.isActive} />} />
      <CategoryForm
        initial={{
          id: c.id,
          code: c.code,
          name: c.name,
          description: c.description ?? "",
          treatment: c.treatment,
          tracksStock: c.tracksStock,
          sortOrder: String(c.sortOrder),
        }}
      />
    </>
  );
}
