import { PageHeader } from "@/components/ui";
import { SupplierForm } from "../supplier-form";

export default function NewSupplierPage() {
  return (
    <>
      <PageHeader title="Tambah pemasok" />
      <SupplierForm />
    </>
  );
}
