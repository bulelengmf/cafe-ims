"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import type { FormState } from "@/components/fields";
import { formValues } from "@/server/form-data";
import { createUnit, setUnitActive, updateUnit } from "@/server/master/units";

export async function saveUnitAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const id = values.id ?? "";
  const result = id ? await updateUnit(getDb(), id, values) : await createUnit(getDb(), values);
  if (!result.ok) return { fieldErrors: result.fieldErrors, formError: result.formError, values };
  revalidatePath("/satuan");
  redirect("/satuan?ok=tersimpan");
}

export async function toggleUnitAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "1";
  const result = await setUnitActive(getDb(), id, active);
  revalidatePath("/satuan");
  redirect(result.ok ? `/satuan?ok=${active ? "aktif" : "nonaktif"}` : `/satuan?e=${result.code}`);
}
