"use client";

import Link from "next/link";
import {
  CheckboxField,
  FormError,
  SelectField,
  SubmitButton,
  TextAreaField,
  TextField,
  useEntityForm,
} from "@/components/fields";
import { TREATMENT_LABELS } from "@/lib/labels";
import { saveCategoryAction } from "./actions";

export interface CategoryFormValues {
  id: string;
  code: string;
  name: string;
  description: string;
  treatment: string;
  tracksStock: boolean;
  sortOrder: string;
}

export function CategoryForm({ initial }: { initial?: CategoryFormValues }) {
  const [state, action] = useEntityForm(saveCategoryAction);
  const editing = Boolean(initial);
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
          name="code"
          label="Kode"
          state={state}
          required
          readOnly={editing}
          defaultValue={initial?.code}
          hint={editing ? "Kode tidak dapat diubah." : "Contoh: CAT-H. Disimpan huruf besar."}
          maxLength={20}
        />
        <TextField
          name="name"
          label="Nama kategori"
          state={state}
          required
          defaultValue={initial?.name}
          maxLength={120}
        />
        <SelectField
          name="treatment"
          label="Perlakuan"
          state={state}
          required
          defaultValue={initial?.treatment}
          options={Object.entries(TREATMENT_LABELS).map(([value, label]) => ({ value, label }))}
        />
        <TextField
          name="sortOrder"
          label="Urutan tampil"
          state={state}
          required
          inputMode="numeric"
          defaultValue={initial?.sortOrder ?? "0"}
          maxLength={4}
        />
        <div className="md:col-span-2">
          <CheckboxField
            name="tracksStock"
            label="Stok barang kategori ini dicatat"
            state={state}
            defaultChecked={initial?.tracksStock ?? true}
            hint="Matikan untuk peralatan dan aset yang dicatat di register, bukan sebagai stok."
          />
        </div>
        <div className="md:col-span-2">
          <TextAreaField
            name="description"
            label="Deskripsi"
            state={state}
            defaultValue={initial?.description}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <SubmitButton>{editing ? "Simpan perubahan" : "Simpan kategori"}</SubmitButton>
        <Link
          href="/kategori"
          className="inline-flex min-h-[44px] items-center rounded-md border border-slate-300 px-4 text-sm text-slate-700 hover:bg-slate-100"
        >
          Batal
        </Link>
      </div>
    </form>
  );
}
