import { notFound } from "next/navigation";
import { getDb } from "@/db/client";
import { ConfirmButton } from "@/components/fields";
import { Badge, PageHeader } from "@/components/ui";
import { getSupplier } from "@/server/master/suppliers";
import { toggleSupplierAction } from "../actions";
import { SupplierForm } from "../supplier-form";

export const dynamic = "force-dynamic";

export default async function EditSupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getSupplier(getDb(), id);
  if (!s) notFound();
  return (
    <>
      <PageHeader title={`Ubah pemasok: ${s.name}`} action={<Badge active={s.isActive} />} />
      <SupplierForm
        initial={{
          id: s.id,
          name: s.name,
          type: s.type,
          contactPerson: s.contactPerson ?? "",
          phone: s.phone ?? "",
          address: s.address ?? "",
          paymentTerms: s.paymentTerms ?? "",
          leadTimeDays: s.leadTimeDays === null ? "" : String(s.leadTimeDays),
          notes: s.notes ?? "",
        }}
      />
      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4 md:p-6">
        <h2 className="text-sm font-semibold text-slate-900">Status pemasok</h2>
        <p className="mt-1 text-sm text-slate-600">
          Pemasok tidak dihapus; yang nonaktif tidak muncul di pilihan baru.
        </p>
        <form action={toggleSupplierAction} className="mt-3">
          <input type="hidden" name="id" value={s.id} />
          <input type="hidden" name="active" value={s.isActive ? "0" : "1"} />
          <ConfirmButton
            tone={s.isActive ? "danger" : "neutral"}
            message={s.isActive ? "Nonaktifkan pemasok ini?" : "Aktifkan kembali pemasok ini?"}
          >
            {s.isActive ? "Nonaktifkan pemasok" : "Aktifkan kembali"}
          </ConfirmButton>
        </form>
      </section>
    </>
  );
}
