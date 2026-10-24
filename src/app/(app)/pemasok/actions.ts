"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import type { FormState } from "@/components/fields";
import { formValues } from "@/server/form-data";
import { createSupplier, setSupplierActive, updateSupplier } from "@/server/master/suppliers";

export async function saveSupplierAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const id = values.id ?? "";
  const result = id
    ? await updateSupplier(getDb(), id, values)
    : await createSupplier(getDb(), values);
  if (!result.ok) return { fieldErrors: result.fieldErrors, formError: result.formError, values };
  revalidatePath("/pemasok");
  redirect("/pemasok?ok=tersimpan");
}

export async function toggleSupplierAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "1";
  const result = await setSupplierActive(getDb(), id, active);
  revalidatePath("/pemasok");
  redirect(
    result.ok ? `/pemasok?ok=${active ? "aktif" : "nonaktif"}` : `/pemasok?e=${result.code}`,
  );
}
