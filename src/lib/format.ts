/** Menghapus nol di belakang koma: "12.500" -> "12.5", "1000.000" -> "1000". Tanpa pemisah ribuan. */
export function trimDecimal(value: string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  if (!value.includes(".")) return value;
  return value.replace(/0+$/, "").replace(/\.$/, "");
}
