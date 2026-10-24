"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import type { FormState } from "@/components/fields";
import { formValues } from "@/server/form-data";
import { createCategory, setCategoryActive, updateCategory } from "@/server/master/categories";

export async function saveCategoryAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const id = values.id ?? "";
  const result = id
    ? await updateCategory(getDb(), id, values)
    : await createCategory(getDb(), values);
  if (!result.ok) return { fieldErrors: result.fieldErrors, formError: result.formError, values };
  revalidatePath("/kategori");
  redirect("/kategori?ok=tersimpan");
}

export async function toggleCategoryAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "1";
  const result = await setCategoryActive(getDb(), id, active);
  revalidatePath("/kategori");
  redirect(
    result.ok ? `/kategori?ok=${active ? "aktif" : "nonaktif"}` : `/kategori?e=${result.code}`,
  );
}
