ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS checkout_site TEXT;

UPDATE public.orders
SET checkout_site = 'shop'
WHERE checkout_site IS NULL;

ALTER TABLE public.orders
  ALTER COLUMN checkout_site SET DEFAULT 'shop';

ALTER TABLE public.orders
  ALTER COLUMN checkout_site SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_checkout_site_created_at
  ON public.orders (checkout_site, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_checkout_site_order_id
  ON public.orders (checkout_site, order_id);

CREATE INDEX IF NOT EXISTS idx_orders_checkout_site_user_id
  ON public.orders (checkout_site, user_id);
