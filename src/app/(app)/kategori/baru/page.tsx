import { PageHeader } from "@/components/ui";
import { CategoryForm } from "../category-form";

export default function NewCategoryPage() {
  return (
    <>
      <PageHeader title="Tambah kategori" />
      <CategoryForm />
    </>
  );
}
