-- ============================================================
-- Naila Mart - Database Schema untuk Supabase (PostgreSQL)
-- Jalankan script ini di Supabase SQL Editor
-- ============================================================

-- 1. Tabel: products (daftar produk)
create table products (
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
create table transactions (
  id uuid default gen_random_uuid() primary key,
  type varchar(50) not null check (type in ('pemasukan', 'pengeluaran')),
  total_amount numeric(12, 2) not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Tabel: transaction_items (detail item per transaksi)
create table transaction_items (
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
create index idx_products_barcode on products(barcode);
create index idx_transactions_type on transactions(type);
create index idx_transactions_created_at on transactions(created_at);
create index idx_transaction_items_transaction on transaction_items(transaction_id);
create index idx_transaction_items_product on transaction_items(product_id);

-- ============================================================
-- Row Level Security (RLS) - Aktifkan & buat policy
-- ============================================================
alter table products enable row level security;
alter table transactions enable row level security;
alter table transaction_items enable row level security;

-- Policy: izinkan semua operasi untuk anon key (karena anon key
-- diamankan di frontend dan hanya bisa dipakai dari URL frontend)
create policy "Allow all on products" on products for all using (true) with check (true);
create policy "Allow all on transactions" on transactions for all using (true) with check (true);
create policy "Allow all on transaction_items" on transaction_items for all using (true) with check (true);

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

create trigger products_updated_at
  before update on products
  for each row
  execute function update_updated_at();
