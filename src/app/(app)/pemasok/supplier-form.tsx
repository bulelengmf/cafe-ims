"use client";

import Link from "next/link";
import {
  FormError,
  SelectField,
  SubmitButton,
  TextAreaField,
  TextField,
  useEntityForm,
} from "@/components/fields";
import { SUPPLIER_TYPE_LABELS } from "@/lib/labels";
import { saveSupplierAction } from "./actions";

export interface SupplierFormValues {
  id: string;
  name: string;
  type: string;
  contactPerson: string;
  phone: string;
  address: string;
  paymentTerms: string;
  leadTimeDays: string;
  notes: string;
}

export function SupplierForm({ initial }: { initial?: SupplierFormValues }) {
  const [state, action] = useEntityForm(saveSupplierAction);
  return (
    <form
      action={action}
      className="space-y-6 rounded-lg border border-slate-200 bg-white p-4 md:p-6"
      noValidate
    >
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <FormError state={state} />
      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          name="name"
          label="Nama pemasok"
          state={state}
          required
          defaultValue={initial?.name}
          maxLength={160}
        />
        <SelectField
          name="type"
          label="Jenis pemasok"
          state={state}
          required
          defaultValue={initial?.type ?? "formal"}
          options={Object.entries(SUPPLIER_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
        />
        <TextField
          name="contactPerson"
          label="Nama kontak"
          state={state}
          defaultValue={initial?.contactPerson}
          maxLength={120}
        />
        <TextField
          name="phone"
          label="Telepon"
          state={state}
          inputMode="tel"
          defaultValue={initial?.phone}
          maxLength={30}
        />
        <TextField
          name="paymentTerms"
          label="Termin pembayaran"
          state={state}
          defaultValue={initial?.paymentTerms}
          hint="Contoh: Tunai, Tempo 14 hari."
          maxLength={120}
        />
        <TextField
          name="leadTimeDays"
          label="Lead time (hari)"
          state={state}
          inputMode="numeric"
          defaultValue={initial?.leadTimeDays}
          hint="Perkiraan hari dari pesan sampai barang tiba (0-365)."
          maxLength={3}
        />
        <div className="md:col-span-2">
          <TextAreaField
            name="address"
            label="Alamat"
            state={state}
            defaultValue={initial?.address}
          />
        </div>
        <div className="md:col-span-2">
          <TextAreaField name="notes" label="Catatan" state={state} defaultValue={initial?.notes} />
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <SubmitButton>{initial ? "Simpan perubahan" : "Simpan pemasok"}</SubmitButton>
        <Link
          href="/pemasok"
          className="inline-flex min-h-[44px] items-center rounded-md border border-slate-300 px-4 text-sm text-slate-700 hover:bg-slate-100"
        >
          Batal
        </Link>
      </div>
    </form>
  );
}
