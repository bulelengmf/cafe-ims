"use client";

import Link from "next/link";
import {
  FormError,
  SelectField,
  SubmitButton,
  TextField,
  useEntityForm,
} from "@/components/fields";
import { DIMENSION_LABELS } from "@/lib/labels";
import { saveUnitAction } from "./actions";

export interface UnitFormValues {
  id: string;
  code: string;
  name: string;
  dimension: string;
}

export function UnitForm({ initial }: { initial?: UnitFormValues }) {
  const [state, action] = useEntityForm(saveUnitAction);
  const editing = Boolean(initial);
  return (
    <form
      action={action}
      className="space-y-6 rounded-lg border border-slate-200 bg-white p-4 md:p-6"
      noValidate
    >
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <FormError state={state} />
      <div className="grid gap-4 md:grid-cols-3">
        <TextField
          name="code"
          label="Kode satuan"
          state={state}
          required
          readOnly={editing}
          defaultValue={initial?.code}
          hint={editing ? "Kode tidak dapat diubah." : "Contoh: kg, ml, dus. Disimpan huruf kecil."}
          maxLength={16}
        />
        <TextField
          name="name"
          label="Nama satuan"
          state={state}
          required
          defaultValue={initial?.name}
          maxLength={60}
        />
        <SelectField
          name="dimension"
          label="Dimensi"
          state={state}
          required
          disabled={editing}
          defaultValue={initial?.dimension}
          hint={editing ? "Dimensi tidak dapat diubah." : undefined}
          options={Object.entries(DIMENSION_LABELS).map(([value, label]) => ({ value, label }))}
        />
      </div>
      <div className="flex flex-wrap gap-3">
        <SubmitButton>{editing ? "Simpan perubahan" : "Simpan satuan"}</SubmitButton>
        <Link
          href="/satuan"
          className="inline-flex min-h-[44px] items-center rounded-md border border-slate-300 px-4 text-sm text-slate-700 hover:bg-slate-100"
        >
          Batal
        </Link>
      </div>
    </form>
  );
}
