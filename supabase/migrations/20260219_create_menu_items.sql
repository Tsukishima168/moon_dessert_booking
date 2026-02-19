-- 建立菜單項目表
create table if not exists public.menu_items (
  id uuid not null default gen_random_uuid() primary key,
  name text not null,
  category text not null,
  description text,
  price numeric not null,
  image_url text,
  is_active boolean not null default true,
  variants jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- 建立索引以提升查詢效能
create index idx_menu_items_category on public.menu_items(category);
create index idx_menu_items_is_active on public.menu_items(is_active);
create index idx_menu_items_created_at on public.menu_items(created_at);

-- 啟用 Row Level Security
alter table public.menu_items enable row level security;

-- 建立 RLS 策略 - 所有人可讀取已上架商品
create policy "Allow public read active menu items"
on public.menu_items
for select
using (is_active = true);

-- 建立 RLS 策略 - 僅管理員可寫入/修改
create policy "Allow admin full access to menu items"
on public.menu_items
for all
using (
  auth.jwt() ->> 'role' = 'admin'
  or (select auth.uid()) is null
);

-- 新增評論
comment on table public.menu_items is '菜單商品表 - 儲存所有甜點商品資訊';
comment on column public.menu_items.variants is '商品規格 - JSON 格式: [{"name": "6吋", "price": 900}]';
