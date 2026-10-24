"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import type { FormState } from "@/components/fields";
import { formValues } from "@/server/form-data";
import { createItem, setItemActive, updateItem } from "@/server/master/items";

export async function saveItemAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const id = values.id ?? "";
  const result = id ? await updateItem(getDb(), id, values) : await createItem(getDb(), values);
  if (!result.ok) return { fieldErrors: result.fieldErrors, formError: result.formError, values };
  revalidatePath("/barang");
  redirect("/barang?ok=tersimpan");
}

export async function toggleItemAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "1";
  const result = await setItemActive(getDb(), id, active);
  revalidatePath("/barang");
  redirect(result.ok ? `/barang?ok=${active ? "aktif" : "nonaktif"}` : `/barang?e=${result.code}`);
}
