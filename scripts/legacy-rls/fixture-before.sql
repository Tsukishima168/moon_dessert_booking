-- 在本機隔離 Postgres 重現 2026-10-19 正式庫「舊表」的權限現況（欄位為近似，權限／policy／trigger 為實查值）。
-- 不含任何正式資料；測試資料由 test-legacy-client-write.sh 另行寫入。

-- role 是整個 cluster 共用，同一個 cluster 載入多次 fixture 時不能重複建立
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;

-- Supabase 的 auth 結構 stub：auth.users（FK 目標）、auth.role()、auth.uid()
create schema auth;
create table auth.users (id uuid primary key);
create function auth.role() returns text language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    nullif((nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'), ''))
$$;
create function auth.uid() returns uuid language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    nullif((nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'), ''))::uuid
$$;
grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;

-- campaigns（0 筆）：「service role full access」FOR ALL TO public USING (true) WITH CHECK (true)
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text, subject text, content text, status text default 'draft',
  sent_count integer default 0, sent_at timestamptz, template_id uuid,
  created_at timestamptz default now());
alter table public.campaigns enable row level security;
create policy "service role full access" on public.campaigns for all to public using (true) with check (true);

-- shop_profiles：shop_orders 的 trigger 會寫入（update_shop_profile_stats 為 SECURITY INVOKER）
create table public.shop_profiles (
  user_id uuid primary key, order_count integer not null default 0,
  total_spent numeric not null default 0, updated_at timestamptz default now());
grant all on public.shop_profiles to service_role;

-- shop_orders（56 筆，含姓名／電話／email）、shop_order_items（86 筆）
create table public.shop_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  customer_name text, phone text, email text, status text default 'pending',
  total numeric default 0, created_at timestamptz default now(), updated_at timestamptz default now());
create table public.shop_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.shop_orders(id),
  product_name text, quantity integer default 1, unit_price numeric default 0,
  created_at timestamptz default now());
alter table public.shop_orders enable row level security;
alter table public.shop_order_items enable row level security;
create policy "Anyone can insert shop orders" on public.shop_orders for insert to public with check (true);
create policy "Anyone can insert shop order items" on public.shop_order_items for insert to public with check (true);

create function public.shop_orders_set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger shop_orders_updated_at_trigger before update on public.shop_orders
  for each row execute function public.shop_orders_set_updated_at();
create function public.update_shop_profile_stats() returns trigger language plpgsql security invoker as $$
begin
  if new.user_id is not null then
    insert into public.shop_profiles(user_id, order_count, total_spent)
    values (new.user_id, 1, coalesce(new.total, 0))
    on conflict (user_id) do update
      set order_count = shop_profiles.order_count + 1,
          total_spent = shop_profiles.total_spent + coalesce(new.total, 0), updated_at = now();
  end if;
  return new;
end $$;
create trigger shop_profile_stats_trigger after insert or update on public.shop_orders
  for each row execute function public.update_shop_profile_stats();

-- 三個 view：owner postgres、security_invoker=true
create view public.shop_order_summary with (security_invoker = true) as
  select o.id, o.status, o.total, o.created_at, count(i.id) as item_count
  from public.shop_orders o left join public.shop_order_items i on i.order_id = o.id group by o.id;
create view public.shop_daily_sales with (security_invoker = true) as
  select date_trunc('day', created_at) as sales_date, count(*) as order_count, sum(total) as revenue
  from public.shop_orders group by 1;
create view public.shop_product_performance with (security_invoker = true) as
  select product_name, sum(quantity) as units, sum(quantity * unit_price) as revenue
  from public.shop_order_items group by 1;

-- signage_items（0 筆）：SELECT 開放；三條寫入 policy 只檢查 auth.role() = 'authenticated'，且 TO public
create table public.signage_items (
  id uuid primary key default gen_random_uuid(),
  title text, body text, image_url text, sort_order integer default 0, active boolean default true,
  created_at timestamptz default now());
alter table public.signage_items enable row level security;
create policy "Public profiles are viewable by everyone." on public.signage_items for select to public using (true);
create policy "Authenticated users can insert" on public.signage_items for insert to public
  with check ((select auth.role()) = 'authenticated');
create policy "Authenticated users can update" on public.signage_items for update to public
  using ((select auth.role()) = 'authenticated');
create policy "Authenticated users can delete" on public.signage_items for delete to public
  using ((select auth.role()) = 'authenticated');

-- 正式庫 relacl：{postgres=arwdDxtm, anon=arwdDxtm, authenticated=arwdDxtm, service_role=arwdDxtm}
grant all on public.campaigns, public.shop_orders, public.shop_order_items, public.signage_items
  to anon, authenticated, service_role;
-- view：anon / authenticated / service_role 皆有 SELECT
grant select on public.shop_order_summary, public.shop_daily_sales, public.shop_product_performance
  to anon, authenticated, service_role;

-- 額外風險 1：anon / authenticated 另有「欄位層級」的 INSERT/SELECT/UPDATE/REFERENCES（表層 REVOKE 清不掉）。
-- 額外風險 2（假設）：view 也有欄位層級 SELECT。
do $$
declare r record;
begin
  for r in
    select c.relname, a.attname, c.relkind from pg_attribute a join pg_class c on c.oid = a.attrelid
    where c.relnamespace = 'public'::regnamespace
      and c.relname in ('campaigns','shop_orders','shop_order_items','signage_items',
                        'shop_order_summary','shop_daily_sales','shop_product_performance')
      and a.attnum > 0 and not a.attisdropped
  loop
    if r.relkind = 'v' then
      execute format('grant select (%I) on public.%I to anon, authenticated', r.attname, r.relname);
    else
      execute format('grant insert (%I), select (%I), update (%I), references (%I) on public.%I to anon, authenticated',
                     r.attname, r.attname, r.attname, r.attname, r.relname);
    end if;
  end loop;
end $$;

-- 額外風險 3：PUBLIC 也持有授權（migration 必須一併從 PUBLIC 收回）
grant insert, update, delete, truncate on public.campaigns, public.shop_orders, public.shop_order_items,
  public.signage_items to public;
grant select on public.campaigns, public.shop_orders, public.shop_order_items, public.signage_items to public;
grant select on public.shop_order_summary, public.shop_daily_sales, public.shop_product_performance to public;
