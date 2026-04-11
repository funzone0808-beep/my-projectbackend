-- Adds optional dine-in billing and payment metadata to saved orders.
-- Safe for existing data: all columns are nullable and added only if missing.

alter table public.orders
  add column if not exists payment_status text,
  add column if not exists billing_status text,
  add column if not exists bill_number text,
  add column if not exists billed_at timestamptz,
  add column if not exists paid_at timestamptz;

comment on column public.orders.payment_status is
  'Optional payment state, for example unpaid, pending, paid, or refunded.';

comment on column public.orders.billing_status is
  'Optional billing state, for example not_billed, bill_ready, billed, or cancelled.';

comment on column public.orders.bill_number is
  'Optional human-readable bill number assigned when a bill is generated.';

comment on column public.orders.billed_at is
  'Optional timestamp when the bill was generated or marked billed.';

comment on column public.orders.paid_at is
  'Optional timestamp when payment was marked paid.';

create index if not exists idx_orders_hotel_slug_billing_status
  on public.orders (hotel_slug, billing_status)
  where billing_status is not null;

create index if not exists idx_orders_hotel_slug_payment_status
  on public.orders (hotel_slug, payment_status)
  where payment_status is not null;
