-- Create the menu_item_availability table
create table if not exists public.menu_item_availability (
  id uuid not null default gen_random_uuid() primary key,
  menu_item_id uuid not null references public.menu_items(id) on delete cascade on update cascade,
  is_available boolean not null default true,
  available_from time without time zone,
  available_until time without time zone,
  unavailable_dates text[] default '{}'::text[],
  available_weekdays text[] default '{1,2,3,4,5}'::text[],
  min_advance_hours integer not null default 24,
  notes text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint unique_menu_item_id unique (menu_item_id)
);

-- Note: In Supabase, if we use time without timezone it is just 'HH:MM:SS'. We'll use text for weekdays to match your frontend mapping (e.g. '1', '2', '3')
-- Add indexes for common queries
create index if not exists idx_menu_item_availability_menu_item_id on public.menu_item_availability(menu_item_id);

-- Enable RLS
alter table public.menu_item_availability enable row level security;

-- Only admins can modify
create policy "Allow admin full access to availability"
on public.menu_item_availability
for all
using (
  auth.jwt() ->> 'role' = 'admin'
  or (select auth.uid()) is null
);

-- Public can read
create policy "Allow public read availability"
on public.menu_item_availability
for select
using (true);

-- Adding comment
comment on table public.menu_item_availability is '菜單商品可用性設置';
