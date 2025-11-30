# Finance.io — UI (Login & Signup) — Front-end-only

Ini implementasi front-end statis yang mereplikasi tampilan Login dan Sign-up pada screenshot. Dibangun menggunakan HTML, CSS, dan JavaScript murni. Tombol-tombol dan link sudah aktif dan menavigasi antar form.

Files:
- `index.html` — halaman login / daftar (awal). Setelah login user diarahkan ke `beranda.html`.
- `beranda.html` — halaman Beranda (dilindungi, tampilkan ringkasan sederhana).
- `transaksi.html` — halaman Transaksi untuk menambah dan melihat riwayat transaksi (disimpan di localStorage).
- `laporan.html` — halaman Laporan yang menampilkan pie & line chart sederhana berdasarkan data transaksi.
- `styles.css` — styling untuk semua halaman.
- `script.js` — logika autentikasi, proteksi halaman, penyimpanan transaksi, dan pembuatan chart sederhana.

Cara menjalankan:
1. Buka folder proyek di file explorer.
2. Klik dua kali `index.html` atau buka di browser favorit (Chrome/Edge/Firefox).
3. Coba alur aplikasi:
   - Buka `index.html` → daftar atau masuk. Setelah berhasil, Anda akan diarahkan ke `beranda.html`.
   - Dari header, buka `Transaksi` untuk menambah transaksi (pemasukan/pengeluaran). Data disimpan di `localStorage` pada browser.
   - Buka `Laporan` untuk melihat representasi pie dan line chart dari pengeluaran.
   - Gunakan tombol `Logout` di header untuk keluar (menghapus status login lokal).

Catatan pengembangan:
- Autentikasi saat ini bersifat lokal (disimpan di `localStorage`). Untuk integrasi nyata, ganti penyimpanan ini dengan panggilan API dan token yang aman.
- Chart sederhana digambar menggunakan canvas (tidak memakai library eksternal). Untuk laporan lebih kaya, pertimbangkan Chart.js.
- Styling mudah disesuaikan di `styles.css`.

Run (Windows):
1. Buka folder `d:\RPL` di File Explorer.
2. Double-click `index.html` untuk membuka aplikasi di browser.

