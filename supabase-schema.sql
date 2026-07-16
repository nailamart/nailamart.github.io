-- ============================================================
-- Naila Mart - Database Schema untuk Supabase (PostgreSQL)
-- Jalankan seluruh script ini di Supabase SQL Editor
-- ============================================================

-- 1. Tabel: products (daftar produk)
create table if not exists products (
  id uuid default gen_random_uuid() primary key,
  barcode varchar(100) unique not null,
  product_name varchar(255) not null,
  stock int default 0,
  purchase_price numeric(12, 2) not null,
  selling_price numeric(12, 2) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Tabel: transactions (riwayat transaksi keuangan)
create table if not exists transactions (
  id uuid default gen_random_uuid() primary key,
  type varchar(50) not null check (type in ('pemasukan', 'pengeluaran')),
  total_amount numeric(12, 2) not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Tabel: users (akun pengguna)
create table if not exists users (
  username varchar(100) primary key,
  password varchar(255) not null,
  role varchar(50) not null check (role in ('pemilik', 'admin', 'kasir')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4a. Tabel: app_settings (pengaturan aplikasi, sync antar perangkat)
create table if not exists app_settings (
  key varchar(100) primary key,
  value text not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Tabel: transaction_items (detail item per transaksi)
create table if not exists transaction_items (
  id uuid default gen_random_uuid() primary key,
  transaction_id uuid references transactions(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  quantity int not null,
  price_per_unit numeric(12, 2) not null,
  subtotal numeric(12, 2) not null
);

-- ============================================================
-- Index untuk performa
-- ============================================================
create index if not exists idx_products_barcode on products(barcode);
create index if not exists idx_transactions_type on transactions(type);
create index if not exists idx_transactions_created_at on transactions(created_at);
create index if not exists idx_transaction_items_transaction on transaction_items(transaction_id);
create index if not exists idx_transaction_items_product on transaction_items(product_id);

-- ============================================================
-- Row Level Security (RLS) - Aktifkan & buat policy
-- ============================================================
alter table if exists products enable row level security;
alter table if exists transactions enable row level security;
alter table if exists transaction_items enable row level security;
alter table if exists users enable row level security;
alter table if exists app_settings enable row level security;

-- Hapus policy lama dulu agar bisa recreate tanpa error
drop policy if exists "Allow all on products" on products;
drop policy if exists "Allow all on transactions" on transactions;
drop policy if exists "Allow all on transaction_items" on transaction_items;
drop policy if exists "Allow all on users" on users;
drop policy if exists "Allow all on app_settings" on app_settings;

-- Policy: izinkan semua operasi untuk anon key
create policy "Allow all on products" on products for all using (true) with check (true);
create policy "Allow all on transactions" on transactions for all using (true) with check (true);
create policy "Allow all on transaction_items" on transaction_items for all using (true) with check (true);
create policy "Allow all on users" on users for all using (true) with check (true);
create policy "Allow all on app_settings" on app_settings for all using (true) with check (true);

-- ============================================================
-- Trigger: auto-update updated_at di tabel products
-- ============================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists products_updated_at on products;
create trigger products_updated_at
  before update on products
  for each row
  execute function update_updated_at();
