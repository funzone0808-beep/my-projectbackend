-- Adds optional QR/table ordering context to saved orders.
-- Safe for existing data: all columns are nullable and added only if missing.

alter table public.orders
  add column if not exists order_type text,
  add column if not exists table_number text,
  add column if not exists order_source text;

comment on column public.orders.order_type is
  'Optional order context, for example dine-in or standard.';

comment on column public.orders.table_number is
  'Optional table number captured from QR/table ordering links.';

comment on column public.orders.order_source is
  'Optional source of the order context, for example qr or website.';

create index if not exists idx_orders_hotel_slug_table_number
  on public.orders (hotel_slug, table_number)
  where table_number is not null;
