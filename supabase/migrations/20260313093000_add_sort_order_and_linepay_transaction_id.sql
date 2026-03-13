ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS linepay_transaction_id TEXT;

CREATE INDEX IF NOT EXISTS idx_menu_items_sort_order
  ON public.menu_items(sort_order);
