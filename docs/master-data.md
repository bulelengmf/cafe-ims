# Master Data: barang, pemasok, kategori, satuan

Halaman: `/barang`, `/pemasok`, `/kategori`, `/satuan` (beranda `/` mengarah ke `/barang`).

## Menjalankan

```bash
npm run db:migrate   # menerapkan 0001_suppliers (tabel suppliers). WAJIB sebelum membuka /pemasok
npm run db:seed      # opsional: data referensi + 3 barang contoh
npm run dev          # http://localhost:3000
```

Jika `/pemasok` menampilkan error 500, hampir pasti migrasi `0001` belum diterapkan.

## Aturan yang berlaku

- Data tidak pernah dihapus; hanya dinonaktifkan. Yang nonaktif tidak muncul di pilihan baru.
- SKU barang, kode kategori, dan kode satuan tidak dapat diubah setelah dibuat; dimensi satuan juga tetap.
- SKU dan kode kategori disimpan huruf besar; kode satuan huruf kecil. Nama pemasok unik tanpa membedakan huruf besar/kecil.
- Kategori atau satuan tidak dapat dinonaktifkan selama masih dipakai barang aktif.
- Angka desimal boleh memakai titik atau koma, tanpa pemisah ribuan. Presisi berlebih ditolak, bukan dibulatkan diam-diam.
- Validasi dilakukan di server (Zod) dan diperkuat constraint database.

## Keterbatasan saat ini (belum dibangun)

- Belum ada login. Jalankan hanya di komputer/jaringan tepercaya.
- Belum ada pembelian, penerimaan, dan stok; halaman barang belum menampilkan saldo stok.
- Mengubah satuan atau faktor konversi barang belum dibatasi. Aturan itu harus ditambahkan bersamaan dengan transaksi stok pertama.

## Tes

```bash
npx vitest run -c vitest.unit.config.ts   # tes murni, tidak menyentuh database
npm test                                   # termasuk tes database; MERESET TEST_DATABASE_URL
```
