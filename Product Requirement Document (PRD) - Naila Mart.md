# **Product Requirement Document (PRD) \- Naila Mart**

---

**Nama Proyek:** Naila Mart  
**Versi:** 1.0  
**Status:** Siap untuk Pengembangan (Ready for Development)

## **1\. Ringkasan Eksekutif**

---

**Naila Mart** adalah aplikasi berbasis web statis modern dan profesional yang dirancang untuk kebutuhan manajemen stok barang (inventaris) toko ritel sekaligus sebagai sistem kasir (Point of Sale/POS) secara real-time. Aplikasi ini bertujuan mempermudah dan mendigitalisasi proses pencatatan barang masuk melalui pemindaian (scan) barcode, transaksi instan oleh kasir, serta kalkulasi otomatis arus kas. Sistem dilengkapi visualisasi rekap keuangan berkala yang datanya dapat diekspor langsung ke dalam format Excel dan PDF resmi.

## **2\. Arsitektur & Teknologi (Tech Stack)**

---

Aplikasi ini dibangun menggunakan arsitektur Jamstack statis berkinerja tinggi yang terhubung langsung dengan infrastruktur cloud database serverless:

* **Frontend:** HTML5 (Struktur semantik) & Tailwind CSS (Desain antarmuka modern, bersih, responsif, dan profesional).  
* **Interaksi & Logika:** JavaScript (ES6+ Native / Vanilla JS untuk performa optimal tanpa overhead framework besar).  
* **Backend & Database:** **Supabase** (PostgreSQL, Real-time Subscription untuk pembaruan saldo langsung, dan Row Level Security).  
* **Pustaka Eksternal (Client-side):**  
  * *Barcode Scanner:* HTML5-QR-Code (Menggunakan modul kamera gawai/laptop) atau integrasi penanganan input hardware scanner USB fisik.  
  * *Ekspor Dokumen:* SheetJS / XLSX (Konversi ke data spreadsheet .xlsx) dan jsPDF bersama jsPDF-AutoTable (Pembuatan dokumen laporan cetak resmi .pdf).  
  * *Visualisasi Grafik:* ApexCharts / Chart.js untuk dasbor keuangan.

## **3\. Hak Akses & Peran Pengguna (User Roles)**

---

| Peran Pengguna | Deskripsi Tanggung Jawab | Fitur Utama yang Diakses   |
| :---- | :---- | :---- |
| **Admin Toko** | Mengelola ketersediaan pasokan barang dan mencatat log logistik masuk. | Halaman Scan Barang Masuk, Sinkronisasi Form Data Produk. |
| **Kasir** | Melayani penjualan ritel langsung kepada pembeli di toko secara cepat. | Halaman POS (Point of Sale), Scanner Belanjaan, Modul Struk Kilat. |
| **Pemilik (Owner)** | Memantau perkembangan bisnis, laba rugi, dan melakukan audit finansial. | Dashboard Utama, Grafik Finansial, Fitur Download Excel & PDF. |

## **4\. Alur Kerja Sistem & Detail Fitur**

### ---

**A. Alur Barang Masuk (Admin Toko)**

1. Admin membuka modul navigasi **"Barang Masuk"**.  
2. Sistem mengaktifkan modul kamera/scanner. Admin melakukan pemindaian barcode pada kemasan produk.  
3. Sistem membaca kode unik tersebut dan secara otomatis mengirimkan query pencarian ke tabel products di Supabase.  
4. **Kondisi Form Input:**  
   * Jika data barcode *belum ada* di database, sistem menampilkan form kosong untuk memasukkan **Nama Barang Baru**, **Jumlah Barang (Stok Awal)**, dan **Harga Barang (Beli & Jual)**.  
   * Jika data barcode *sudah terdaftar*, sistem otomatis mengunci input nama barang dan mengarahkan admin untuk memasukkan **Jumlah Tambahan Stok (Restock)** serta memperbarui harga modal terbaru jika ada perubahan.  
5. Admin menekan tombol "Simpan". Sistem mengirim data baru/update ke Supabase sekaligus mencatat entri baru pada transaksi pengeluaran (pembelian aset stok).

### **B. Alur Transaksi Penjualan (Kasir)**

1. Kasir bersiap di halaman utama **"Kasir / POS"**.  
2. Saat pembeli membawa barang, kasir memindai barcode tiap produk berturut-turut.  
3. Sistem secara dinamis mencocokkan barcode dan memasukkan produk ke **Keranjang Belanja digital (Cart)** secara real-time di layar.  
   * Kuantitas default diset 1 unit per scan dan dapat disesuaikan manual.  
   * Akumulasi total tagihan belanja langsung terkalkulasi secara instan.  
4. Kasir menekan tombol **"Selesaikan Transaksi"** setelah menerima pembayaran.  
5. **Aksi Otomatis Sistem (Database Trigger/Batch Operation):**  
   * Memotong jumlah kuantitas produk bersangkutan dari tabel stok barang (stock \= stock \- qty\_terjual).  
   * Mencatat entri pendapatan baru ke tabel riwayat keuangan dengan tipe **pemasukan**.  
   * Memperbarui indikator saldo utama toko secara real-time melalui \*Supabase Realtime Channel\*.  
   * Memunculkan jendela dialog cetak (Print Modal) nota/struk belanja.

### **C. Modul Rekap Keuangan & Laporan**

* Menyediakan tab filter periode waktu yang dinamis: **Harian, Mingguan, Bulanan, dan Tahunan**.  
* Menampilkan metrik agregat: Total Pendapatan Kotor, Total Pengeluaran Modal, dan Laba Bersih Operasional.  
* **Mekanisme Unduhan Data:**  
  * **Tombol "Download Excel":** JavaScript akan memproses array of object dari database Supabase menjadi struktur baris kolom, menerapkan format mata uang Rupiah, dan menghasilkan file berkas .xlsx yang rapi.  
  * **Tombol "Download PDF":** Menghasilkan layout dokumen formal siap cetak lengkap dengan nama toko "Naila Mart", tabel data bergaris, penomoran halaman, dan baris kalkulasi total di bagian bawah halaman.

## **5\. Skema Database (Supabase / PostgreSQL DDL)**

---

Berikut tata struktur tabel relasional yang diimplementasikan langsung pada konsol editor SQL Supabase:

### **1\. Tabel: products**

create table products (  
  id uuid default gen\_random\_uuid() primary key,  
  barcode varchar(100) unique not null,  
  product\_name varchar(255) not null,  
  stock int default 0,  
  purchase\_price numeric(12, 2\) not null, \-- Harga modal awal barang  
  selling\_price numeric(12, 2\) not null,  \-- Harga ritel jual toko  
  created\_at timestamp with time zone default timezone('utc'::text, now()) not null,  
  updated\_at timestamp with time zone default timezone('utc'::text, now()) not null  
);

### **2\. Tabel: transactions**

create table transactions (  
  id uuid default gen\_random\_uuid() primary key,  
  type varchar(50) not null, \-- Berisi validasi value: 'pemasukan' atau 'pengeluaran'  
  total\_amount numeric(12, 2\) not null,  
  description text,  
  created\_at timestamp with time zone default timezone('utc'::text, now()) not null  
);

### **3\. Tabel: transaction\_items**

create table transaction\_items (  
  id uuid default gen\_random\_uuid() primary key,  
  transaction\_id uuid references transactions(id) on delete cascade,  
  product\_id uuid references products(id) on delete set null,  
  quantity int not null,  
  price\_per\_unit numeric(12, 2\) not null,  
  subtotal numeric(12, 2\) not null  
);

## **6\. Spesifikasi Desain Antarmuka (UI/UX)**

---

Untuk memastikan visualisasi terkesan modern dan tepercaya, Tailwind CSS dikonfigurasikan dengan prinsip minimalis-enterprise:

* **Palet Warna Komersial:**  
  * *Warna Utama:* Deep Slate Blue (\#1E293B / slate-800) memberikan kesan kokoh dan profesional.  
  * *Warna Aksen / Saldo Masuk:* Emerald Green (\#10B981\` / emerald-500) merepresentasikan transaksi sukses dan arus kas positif.  
  * *Warna Pengeluaran / Bahaya:* Rose Red (\#F43F5E / rose-500) membedakan pos pengeluaran modal agar mudah diaudit.  
  * *Latar Belakang:* Neutral Soft Gray (\#F8FAFC) menjaga kontras teks agar mata kasir tidak mudah lelah.  
* **Tipografi:** Font sans-serif global berbobot bersih (seperti Inter atau Geist UI) dengan kerning ketat.  
* **Layouting:** Sidebar navigasi presisi (tetap di sisi kiri layar desktop/tablet) untuk kemudahan perpindahan halaman secara instan tanpa memuat ulang browser (Single Page UI).

## **7\. Kebutuhan Non-Fungsional**

* ---

  **Kecepatan (Performance):** Waktu muat halaman awal \< 1 detik karena aset statis dioptimalkan penuh tanpa server-side rendering berat.  
* **Keamanan Data:** Aktivasi Row Level Security (RLS) pada dasbor Supabase untuk memastikan data penjualan tidak dapat dimanipulasi dari luar sistem oleh pihak ketiga.  
* **Ketahanan Koneksi (Reliability):** Pemanfaatan \*State Management\* lokal menggunakan browser LocalStorage guna menampung sementara data transaksi apabila koneksi internet kasir mengalami fluktuasi/putus mendadak.