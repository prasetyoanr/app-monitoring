# Modul divisi layanan

Setiap folder di sini mewakili layanan yang memiliki form atau alur khusus.

- `it/`: template permintaan bantuan IT.
- `purchase/`: template permintaan pengadaan.

Divisi tanpa kebutuhan khusus tidak memerlukan folder dan dapat memakai form umum. Untuk layanan baru, buat folder baru hanya jika membutuhkan template, validasi, atau komponen khusus. Daftarkan template tersebut di `src/features/service-requests/template-registry.ts`.

Field `Location` dikelola oleh form inti dan berlaku untuk semua divisi. Template dapat menentukan field, validasi, dan susunan form lain sesuai kebutuhan divisi. Gunakan `ticketField` untuk menyimpan jawaban ke informasi inti tiket, misalnya judul, kategori, atau deskripsi.
