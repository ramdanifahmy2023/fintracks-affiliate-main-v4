Blueprint Aplikasi Web Digital Marketing Affiliate
📋 Informasi Proyek
Developer: PT FAHMYID DIGITAL GROUP
Platform: Shopee & TikTok Affiliate
Tech Stack: Lovable.dev AI, Supabase (Database), GitHub (Repository)
Visi: Memudahkan pengelolaan bisnis affiliate
Misi: Sistem input data cepat dan efisien untuk menghasilkan analisa yang akurat dan detail

👥 Sistem User & Akses
Jenis User

Superadmin - Akses penuh semua fitur
Leader - Mengelola tim dan laporan
Admin - Input data operasional
Staff - Input laporan harian & absensi
Viewer - Hanya melihat data

Login & Keamanan

Login menggunakan email & password
Tidak ada registrasi publik - hanya Superadmin yang bisa membuat akun
Setiap user punya hak akses berbeda di setiap halaman


🎨 Desain UI/UX
Tampilan

Responsif - Nyaman di desktop & smartphone
Theme: Light, Dark, System
Warna utama: Biru dominan
Chart/Grafik: Warna-warni segar (style Google)

Fitur Modern

✅ PWA - Bisa diinstall sebagai aplikasi
✅ Push Notification - Absensi, komisi cair, pengumuman
✅ Offline Mode - Akses data saat koneksi lemah
✅ Onboarding otomatis untuk user baru
✅ Tooltip bantuan di setiap form
✅ FAQ & Tutorial di halaman khusus
✅ Accessibility - Opsi font/warna custom


📊 Struktur Halaman & Fitur
1. 🏠 Dashboard (Insight & Analytics)
Filter Global:

Periode: Hari/Minggu/Bulan/Tahun
Group: Multi-select dropdown
Karyawan: Multi-select dropdown

Kartu Metrik Utama:

💰 Total Komisi Kotor (+ % vs bulan lalu, hijau naik/merah turun)
💵 Total Komisi Bersih (+ % vs bulan lalu)
💳 Total Komisi Cair (+ % vs bulan lalu)
📉 Total Pengeluaran (+ % vs bulan lalu, merah naik/hijau turun)
👥 Total Karyawan
📦 Total Group

Visualisasi Data:

Diagram Omset (dari laporan harian karyawan)
Diagram Komisi (kotor, bersih, cair)
Diagram Performa Akun
Diagram Performa Group
Grafik Tren harian/mingguan vs target
Breakdown sumber komisi per produk/segmen

Fitur Khusus:

Custom Report Builder (user bisa buat laporan sendiri)
Ranking Karyawan (omset tertinggi - terendah dengan progress bar)


2. 📈 Performa Tim & Individu
Akses:

Superadmin & Leader: CRUD
Admin & Viewer: Read only

Filter: Tanggal, Group, Karyawan
Export: PDF/CSV
Data Ditampilkan:

Total Omset
Total Komisi (Kotor, Bersih, Cair)
Total Absensi
Total Akun
Persentase Progress KPI
Rincian performa per group dan karyawan
Progress pencapaian KPI masing-masing


3. 📝 Jurnal Laporan Harian (Khusus Staff)
Akses: Staff only (Create, Read, Update)
Form Input - Auto Fill:

Tanggal: Otomatis hari ini
Group & Nama: Otomatis dari data staff login
ID HP: Dropdown (device milik staff)
Username Akun: Dropdown (akun yang dikelola group)

Input Manual:

Shift: 1/2/3

Shift 1: Saldo awal = 0
Shift 2/3: Saldo awal = saldo akhir shift sebelumnya


Kategori Produk: Fashion, Elektronik, Kecantikan, Food, Hobi, Otomotif, dll
Status Live:

Lancar: Ambil saldo dari shift sebelumnya
Mati/Relive: Saldo awal = 0


Omset Awal & Akhir: Format Rupiah (IDR)

Fitur Multi-Device:

Setelah isi device #1, form otomatis muncul untuk device #2 (sampai #10)
Tidak perlu klik ulang dari awal


4. ⏰ Absensi (Khusus Staff)
Cara Kerja:

Staff hanya klik tombol "Absen Masuk" di dashboard
Absen Keluar otomatis tercatat saat staff mengisi Jurnal Laporan Harian
Tidak ada tombol absen keluar manual


5. 💰 Data Komisi Affiliate
Akses:

Superadmin & Leader: CRUD
Admin & Viewer: Read only

Filter: Tanggal, Group, Karyawan
Search: Username akun
Export: PDF/CSV
Form Laporan Komisi:

Username Akun (dropdown dari data akun)
Periode: M1/M2/M3/M4/M5 (minggu dalam bulan)
Komisi Kotor (Format: 100.000)
Komisi Bersih
Komisi Cair

Tampilan:

Rincian komisi per akun
Total komisi kotor, bersih, cair


6. 💳 Cashflow / Arus Kas & Pembukuan
Akses:

Superadmin: CRUD
Leader & Admin: Create & Read
Viewer: Read only

Filter: Tanggal, Group, Karyawan
Export: PDF/CSV
Form Pengeluaran:

Tanggal
Group
Nominal (IDR)
Link Bukti (URL/file)
Kategori: Fix Cost / Variable Cost
Keterangan

Form Pemasukan:

Input Manual
Otomatis dari data komisi cair yang sudah ada

Validasi: Semua field wajib diisi lengkap

7. 🏢 Management Asset
Akses:

Superadmin & Admin: CRUD
Leader & Viewer: Read only

Filter: Tanggal, Group, Karyawan
Export: PDF/CSV
Form Tambah Asset:

Tanggal Pembelian
Harga Pembelian
Quantity
Keterangan

Tampilan: Total & rincian semua asset

8. 💸 Saldo Hutang Piutang
Akses:

Superadmin: CRUD
Leader & Admin: Create & Read
Viewer: Read only

Filter: Tanggal, Group, Karyawan
Export: PDF/CSV
Fitur: Form tambah data + tampilan total & rincian hutang piutang

9. 📚 SOP & Knowledge Center
Akses: Semua user bisa Read, hanya Superadmin yang CRUD
Fitur:

Upload dokumen PDF
Embed link Google Drive
Embed link YouTube


10. 📊 Laba Rugi Bisnis
Akses:

Superadmin: CRUD
Admin: Create & Read
Leader & Viewer: Read only

Filter: Tanggal, Group, Karyawan
Export: PDF/CSV

11. 👤 Direktori Karyawan
Akses:

Superadmin: CRUD
Leader: Create, Read, Update
Viewer: Read only

Search: Nama
Export: PDF/CSV
Form Tambah Karyawan:

Nama Lengkap
Tanggal Lahir
Jabatan (Superadmin/Leader/Admin/Host Live/Kreator/Viewer)
Email (untuk login)
Password (untuk login)
Alamat
Tanggal Mulai Kerja
Group (dropdown dari data group)

Tampilan: Daftar lengkap karyawan

12. 📱 Inventaris Device Tim
Akses:

Superadmin & Leader: CRUD
Admin & Viewer: Read only

Search: ID HP
Filter: Tanggal, Group, Karyawan
Export: PDF/CSV
Form Tambah Device:

ID Device (angka)
IMEI (angka)
Akun Google
Tanggal Beli
Harga Beli
Link Screenshot

Pagination: 20 baris per halaman

13. 🔐 Daftar Akun Affiliate
Akses:

Superadmin & Leader: CRUD
Admin & Viewer: Read only

Search: Username
Export: PDF/CSV
Form Tambah Akun:

Platform: Shopee/TikTok
Email
Password
Username
No HP
Status Akun: Aktif/Banned Sementara/Banned Permanen
Status Data: Kosong/Proses Pengajuan/Ditolak/Verifikasi Berhasil
Keterangan

Pagination: 20 baris per halaman

14. 🏷️ Manage Group
Akses:

Superadmin & Leader: CRUD
Admin & Viewer: Read only

Search: Nama Group
Export: PDF/CSV
Form Tambah/Kelola Group:

Nama Group
Pilih Karyawan: Multi-select dropdown
Pilih Device: Multi-select dropdown
Pilih Akun Affiliate: Multi-select dropdown

⚠️ Validasi Penting:

1 Device = 1 Group (tidak bisa dobel)
1 Karyawan = 1 Group
1 Akun = 1 Group
Dropdown hanya tampilkan data yang belum masuk group lain

Contoh Logika:

Group 1: 3 host live, 10 device HP, 30 akun affiliate
Group 2: 3 host live, 9 device HP, 29 akun affiliate

Pagination: 20 baris per halaman

15. 🎯 Goal & Target KPI
Akses:

Superadmin & Leader: CRUD
Admin: Read only

Setting Target untuk Host Live:

Target Omset (Format IDR: 100.000.000)
Target Komisi Kotor (Format IDR)
Target Kehadiran (Format angka hari: 25)

Rumus KPI:

Realisasi KPI = (Total omset bulanan / Target omset) × 100%
Kehadiran = (Total hari hadir / Hari kerja) × 100%


16. ⚙️ Pengaturan Akun Pribadi
Fitur:

Edit Nama
Edit Email
Ganti Password
Upload Foto Avatar (atau acak otomatis)

Tombol: Logout

🔧 Catatan Teknis untuk Developer
1. Standarisasi Hak Akses

CRUD = Create, Read, Update, Delete
CR = Create & Read
R = Read only
Konsisten di semua halaman sesuai role user

2. Validasi Double Assignment

1 device/karyawan/akun = 1 group saja
Dropdown hanya tampilkan yang belum tergabung group
Jika group dihapus, relasi otomatis dikosongkan

3. Filter & Navigasi Data

Filter multi-level tetap berfungsi dengan paginasi
Filter group → filter karyawan menyesuaikan anggota group
Maksimal 20 baris per halaman

4. Pengisian Form Otomatis

Field "Nama/Group" auto-fill dari session user login
Omset/saldo awal ambil dari shift sebelumnya
Jika belum ada data sebelumnya, munculkan warning

5. Periode Komisi Mingguan

M1 s.d. M5 = minggu dalam bulan berjalan
Dimulai setiap hari Senin
Jika bulan mulai/akhir bukan Senin, tetap ikuti tanggal

6. Relasi Data

One-to-many (satu-ke-banyak)
Tidak boleh double assignment
Jika group dihapus, relasi dikosongkan

7. Export & Custom Report

Bisa export dari tabel statis maupun hasil filter
User bisa pilih field/matrix sesuai kebutuhan

8. Logika Absensi & Shift

1 karyawan tidak bisa input shift yang sama dalam 1 hari
Pengisian shift harus berurutan dan tidak overlap

9. Audit Trail & History

Setiap aksi tambah/edit/hapus tercatat
Info minimal: user, waktu, detail perubahan
History bisa ditampilkan per entity

10. Optimasi Performance

Gunakan paginasi untuk semua halaman dengan banyak data
Query dioptimasi agar loading cepat
20 data per halaman (dengan/tanpa filter)


📱 Fitur Notifikasi Push

Reminder Absensi
Notifikasi Komisi Cair
Reminder Pengisian Laporan
Pengumuman dari Admin/Superadmin
