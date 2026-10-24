# Cafe IMS — Inventory & Purchasing Management System

Fondasi proyek: Next.js 15 + TypeScript + Tailwind CSS + Drizzle ORM + PostgreSQL.

**Status saat ini:** baru fondasi dan skema awal (outlet, user, role, kategori, satuan, barang).
Modul bisnis (PR, PO, receiving, ledger, dst.) belum dibangun. Halaman utama hanyalah placeholder.

## Prasyarat (Arch Linux)

- Node.js >= 20.9 dan npm (teruji di Node 22)
- PostgreSQL (skema memakai SQL standar dan hanya fitur bawaan; lihat bagian "Kompatibilitas")

```bash
sudo pacman -S --needed nodejs npm postgresql git
```

## 1. Menyiapkan PostgreSQL

Lewati `initdb` jika klaster Anda sudah pernah diinisialisasi.

```bash
sudo -iu postgres initdb --locale=C.UTF-8 --encoding=UTF8 -D /var/lib/postgres/data
sudo systemctl enable --now postgresql
```

Buat user aplikasi (akan diminta password; pilih sendiri, jangan dibagikan) dan dua database:

```bash
sudo -u postgres createuser --pwprompt cafe_app
sudo -u postgres createdb -O cafe_app cafe_inventory
sudo -u postgres createdb -O cafe_app cafe_inventory_test
```

`cafe_inventory_test` dipakai pengujian otomatis. **Isinya dihapus setiap `npm test`.**

## 2. Instalasi dan konfigurasi

```bash
npm install
cp .env.example .env
```

Edit `.env`, ganti `GANTI_PASSWORD` dengan password yang Anda buat. File `.env` sudah ada di
`.gitignore` dan tidak boleh di-commit. Jika password mengandung karakter khusus (`@`, `:`, `/`, `#`),
encode dengan URL-encoding.

## 3. Migrasi dan seed

```bash
npm run db:migrate   # menerapkan migrasi di folder drizzle/
npm run db:seed      # data referensi DEV: 5 peran, CAT-A..G, satuan, 1 outlet, 3 barang contoh
```

Seed bisa dijalankan berulang kali tanpa duplikasi dan menolak berjalan jika `NODE_ENV=production`.
Seed belum membuat akun pengguna (menunggu modul autentikasi).

## 4. Menjalankan aplikasi

```bash
npm run dev          # http://localhost:3000, cek koneksi DB di /api/health
# atau produksi:
npm run build && npm run start
```

## 5. Pengujian dan pemeriksaan

```bash
npm test             # vitest: reset DB test, migrasi dari nol, lalu tes constraint
npm run typecheck
npm run lint
npm run format:check   # Prettier (format otomatis: npm run format)
npm run db:check     # konsistensi folder migrasi
```

## Konvensi kode

- **Lapisan:** `schema` → `src/domain/<modul>` (aturan bisnis murni) → route handler tipis → UI.
  Aturan bisnis hanya boleh ada di lapisan domain dan diuji di sana. Lint melarang `src/domain`
  mengimpor Next/React atau `app/`.
- **Angka:** semua hitungan jumlah/biaya/nilai lewat `src/domain/decimal` (berbasis decimal.js),
  bukan `number` JS. Pembulatan: ROUND_HALF_UP (asumsi; dokumen belum menetapkan kebijakan).
- **Lint ketat:** `eqeqeq`, tanpa `console` (kecuali skrip migrate/seed), tanpa `!` (non-null assertion)
  di kode aplikasi, `import type` untuk tipe.
- `next lint` ditandai deprecated oleh Next 15; perlu dipindah ke ESLint CLI sebelum upgrade ke Next 16.

## Mengubah skema

1. Edit file di `src/db/schema/`.
2. `npm run db:generate -- --name nama_perubahan` membuat file migrasi baru di `drizzle/`.
3. Periksa SQL-nya, lalu `npm run db:migrate`.
4. Commit skema **dan** folder `drizzle/` (termasuk `drizzle/meta/`) bersama-sama.

Jangan mengedit migrasi yang sudah diterapkan; buat migrasi baru.

## Keputusan desain skema

- **ID:** `uuid` dengan `gen_random_uuid()` (bawaan PostgreSQL, tanpa ekstensi).
- **Angka:** kolom jumlah/biaya memakai `numeric` (bukan float). Drizzle mengembalikannya sebagai string
  agar tidak ada kehilangan presisi; hitungan ledger kelak harus memakai aritmetika desimal.
- **Kategori dapat dikonfigurasi:** `item_categories` adalah data; hanya kolom `treatment` yang enum.
- **Barang tidak boleh dihapus jika dipakai:** semua FK memakai `ON DELETE RESTRICT`; barang dinonaktifkan via `is_active`.
- **Multi-peran:** `user_roles` (user, role, outlet) memungkinkan satu karyawan merangkap, terikat outlet.
  Pembatasan pemisahan tugas (mis. tidak boleh menyetujui permintaan sendiri) ditegakkan di logika approval, bukan di tabel ini.
- **Master barang bersifat global**; stok per outlet akan ada di stock ledger (tahap berikutnya).
- **`updated_at`** diisi oleh aplikasi (`$onUpdate`), bukan trigger. Perubahan lewat SQL manual tidak memperbaruinya.

## Kompatibilitas PostgreSQL

Migrasi hanya memakai `CREATE TYPE ... AS ENUM`, tabel, `CHECK`, FK, dan indeks (termasuk indeks ekspresi
`lower(email)`), serta `gen_random_uuid()`. Tidak ada ekstensi atau fitur khusus versi 16.
**Teruji hanya di PostgreSQL 16.** Belum dijalankan di PostgreSQL 18 karena tidak tersedia di lingkungan
pengembangan; kompatibilitas dengan 18 baru berdasarkan pemeriksaan SQL. Silakan jalankan `npm test` di
mesin Anda dan laporkan jika ada kegagalan.

## Keamanan

- Tidak ada kredensial di source code; konfigurasi lewat environment variables (divalidasi Zod di `src/lib/env.ts`).
- `/api/health` tidak membocorkan detail koneksi saat database mati.
- Tes menolak berjalan jika `TEST_DATABASE_URL` sama dengan `DATABASE_URL` atau nama database tidak mengandung "test".

## Struktur

```
drizzle/            migrasi SQL + snapshot (hasil drizzle-kit)
src/app/            halaman Next.js (placeholder) dan /api/health
src/db/schema/      skema Drizzle (enums, outlets, auth, catalog)
src/db/             client, migrate.ts, seed.ts, seed-data.ts
src/domain/         aturan bisnis murni (saat ini: decimal/)
src/lib/env.ts      validasi environment
tests/              global-setup (reset+migrasi DB test) dan tes vitest
```
