export const TREATMENT_LABELS: Record<string, string> = {
  stock_ledger: "Persediaan bahan (stok dicatat)",
  consumable: "Habis pakai operasional",
  resale: "Barang dagangan",
  equipment_register: "Peralatan tahan lama (register)",
  fixed_asset: "Aset tetap / CAPEX",
  quarantine: "Karantina / rusak / kedaluwarsa",
};

export const DIMENSION_LABELS: Record<string, string> = {
  mass: "Berat",
  volume: "Volume",
  count: "Jumlah",
  length: "Panjang",
};

export const SUPPLIER_TYPE_LABELS: Record<string, string> = {
  formal: "Formal (invoice/PO)",
  market: "Pasar (nota sederhana)",
};

export const FLASH_OK: Record<string, string> = {
  tersimpan: "Data berhasil disimpan.",
  aktif: "Data diaktifkan kembali.",
  nonaktif: "Data dinonaktifkan. Riwayat tetap tersimpan.",
};

export const FLASH_ERROR: Record<string, string> = {
  has_active_items:
    "Tidak dapat dinonaktifkan: masih dipakai oleh barang aktif. Nonaktifkan atau ubah barangnya dulu.",
  not_found: "Data tidak ditemukan.",
};
