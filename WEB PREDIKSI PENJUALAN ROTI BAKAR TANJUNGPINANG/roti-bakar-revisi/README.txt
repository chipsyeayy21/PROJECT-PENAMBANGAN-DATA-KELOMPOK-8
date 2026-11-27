DASHBOARD FORECASTING PENJUALAN ROTI BAKAR TANJUNGPINANG
Time Series Analysis berbasis Moving Average dan Pola Hari
Mitra: Roti Bakar Khas Bandung - Tanjungpinang

CARA MENJALANKAN
Buka index.html di peramban (Chrome/Edge/Firefox). Tidak perlu server atau
instalasi apa pun. Seluruh perhitungan berjalan di peramban.
Folder css/ dan js/ harus tetap berada satu tingkat dengan index.html.

STRUKTUR PROYEK
index.html -> kerangka halaman (header, menu navigasi 5, isi semua menu)

css/ -> gaya, dipisah per bagian
  01_base-tokens        warna, font, variabel dasar
  02_header             header identitas laporan & mitra
  03_navigasi-menu      bar navigasi menu
  04_layout-kontrol     layout utama, kartu, kontrol global
  05_panel-simulasi     panel parameter simulasi (N, hari target)
  06_kpi                4 kartu KPI
  07_grafik-svg         grafik SVG & tooltip
  08_rincian-stok       rincian perhitungan & rekomendasi stok
  09_tombol-form-tabel  tombol, form input, tabel data
  10_halaman-ekstra     checklist stok, metodologi, tentang proyek
  11_toast              notifikasi

js/ -> logika, dipisah per bagian (URUTAN MUAT PENTING, sesuai nomor)
  01_dataset            data 48 hari operasional, 8 varian terlaris
  02_helper             helper tanggal, kuantil IQR, format, localStorage
  03_toast-tooltip      notifikasi & tooltip grafik
  04_state              state aplikasi
  05_mesin-forecasting  SMA, indeks hari, IQR capping, MAE/RMSE/MAPE
  06_grafik-svg         renderer grafik
  07_tabel-menu-ekstra  tabel rekap & halaman ekstra
  08_render-utama       renderAll (menyatukan semua tampilan)
  09_event-listeners    menu, kontrol, tambah data, impor/ekspor CSV

CATATAN
- Data yang ditambahkan pengguna tersimpan di localStorage peramban masing-masing.
- Angka akurasi (MAPE) di dashboard adalah akurasi historis, bukan uji hari baru.
- Nama bahan baku di checklist belanja adalah estimasi.
