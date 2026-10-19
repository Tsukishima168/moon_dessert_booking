create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create table public.orders (order_id text primary key, user_id uuid, final_price numeric, created_at timestamptz default now());
alter table public.orders enable row level security;
grant all on public.orders to anon, authenticated, service_role;
grant insert, truncate on public.orders to public;   -- 模擬 PUBLIC 也有寫入授權：migration 必須一併收回
create policy "anon_can_insert_orders" on public.orders for insert to anon with check (true);
create policy "authenticated_can_insert_orders" on public.orders for insert to authenticated with check (true);
create policy "authenticated_can_select_own_orders" on public.orders for select to authenticated using (user_id = nullif(current_setting('request.jwt.claim.sub', true),'')::uuid);
