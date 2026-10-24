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
import { saveItemAction } from "./actions";

type Option = { id: string; code: string; name: string };

export interface ItemFormValues {
  id: string;
  sku: string;
  name: string;
  description: string;
  categoryId: string;
  purchaseUnitId: string;
  usageUnitId: string;
  purchaseToUsageFactor: string;
  minStockLevel: string;
  reorderPoint: string;
  tracksExpiry: boolean;
  storageLocation: string;
}

export function ItemForm({
  initial,
  categories,
  units,
}: {
  initial?: ItemFormValues;
  categories: Option[];
  units: Option[];
}) {
  const [state, action] = useEntityForm(saveItemAction);
  const editing = Boolean(initial);
  const unitOptions = units.map((u) => ({ value: u.id, label: `${u.name} (${u.code})` }));
  return (
    <form
      action={action}
      className="space-y-6 rounded-lg border border-slate-200 bg-white p-4 md:p-6"
      noValidate
    >
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <FormError state={state} />

      <fieldset className="grid gap-4 md:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold text-slate-900">Identitas barang</legend>
        <TextField
          name="sku"
          label="SKU"
          state={state}
          required
          readOnly={editing}
          defaultValue={initial?.sku}
          hint={
            editing
              ? "SKU tidak dapat diubah."
              : "Huruf, angka, titik, garis bawah, strip. Disimpan huruf besar."
          }
          maxLength={40}
        />
        <TextField
          name="name"
          label="Nama barang"
          state={state}
          required
          defaultValue={initial?.name}
          maxLength={160}
        />
        <SelectField
          name="categoryId"
          label="Kategori"
          state={state}
          required
          defaultValue={initial?.categoryId}
          options={categories.map((c) => ({ value: c.id, label: `${c.code} · ${c.name}` }))}
        />
        <TextField
          name="storageLocation"
          label="Lokasi simpan"
          state={state}
          defaultValue={initial?.storageLocation}
          maxLength={80}
        />
        <div className="md:col-span-2">
          <TextAreaField
            name="description"
            label="Deskripsi"
            state={state}
            defaultValue={initial?.description}
          />
        </div>
      </fieldset>

      <fieldset className="grid gap-4 md:grid-cols-3">
        <legend className="mb-2 text-sm font-semibold text-slate-900">Satuan dan konversi</legend>
        <SelectField
          name="purchaseUnitId"
          label="Satuan beli"
          state={state}
          required
          defaultValue={initial?.purchaseUnitId}
          options={unitOptions}
        />
        <SelectField
          name="usageUnitId"
          label="Satuan pakai"
          state={state}
          required
          defaultValue={initial?.usageUnitId}
          options={unitOptions}
        />
        <TextField
          name="purchaseToUsageFactor"
          label="Isi per satuan beli"
          state={state}
          required
          inputMode="decimal"
          defaultValue={initial?.purchaseToUsageFactor ?? "1"}
          hint="Berapa satuan pakai dalam 1 satuan beli. Contoh: 1 kg = 1000 g, isi 1000."
        />
      </fieldset>

      <fieldset className="grid gap-4 md:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold text-slate-900">
          Batas stok (dalam satuan pakai)
        </legend>
        <TextField
          name="minStockLevel"
          label="Stok minimum"
          state={state}
          required
          inputMode="decimal"
          defaultValue={initial?.minStockLevel ?? "0"}
        />
        <TextField
          name="reorderPoint"
          label="Titik pesan ulang"
          state={state}
          required
          inputMode="decimal"
          defaultValue={initial?.reorderPoint ?? "0"}
          hint="Untuk peralatan/aset (CAT-E, CAT-F) batas stok tidak dipakai; isi 0."
        />
        <div className="md:col-span-2">
          <CheckboxField
            name="tracksExpiry"
            label="Barang memiliki tanggal kedaluwarsa"
            state={state}
            defaultChecked={initial?.tracksExpiry}
          />
        </div>
      </fieldset>

      <div className="flex flex-wrap gap-3">
        <SubmitButton>{editing ? "Simpan perubahan" : "Simpan barang"}</SubmitButton>
        <Link
          href="/barang"
          className="inline-flex min-h-[44px] items-center rounded-md border border-slate-300 px-4 text-sm text-slate-700 hover:bg-slate-100"
        >
          Batal
        </Link>
      </div>
    </form>
  );
}
