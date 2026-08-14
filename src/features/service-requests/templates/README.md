# Template form tujuan layanan

Folder ini berisi template form yang dipakai portal permintaan.

- `it-support.ts`: form untuk tujuan layanan **IT Team**.
- `purchase-request.ts`: form untuk tujuan layanan **Purchase**.
- `types.ts`: jenis field yang dapat digunakan template.
- `index.ts`: daftar template aktif yang ditampilkan kepada pemohon.

Untuk menambahkan divisi tujuan baru, buat satu file template baru, tambahkan ke `index.ts`, lalu pastikan nama `serviceDivision` sama dengan data divisi pada Master Data. Field umum tiket dapat dipetakan melalui `ticketField`; field lain disimpan dalam data permintaan.
