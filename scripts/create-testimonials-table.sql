-- Testimonials table for hotel-specific, moderation-ready public reviews.
-- Safe first version:
-- - supports hotel-specific public rendering
-- - supports admin-managed active/archive control
-- - supports future approval flow for public review submissions

create table if not exists public.testimonials (
  id bigserial primary key,
  hotel_slug text not null,
  guest_name text not null,
  guest_role text not null default '',
  review_text text not null,
  star_rating integer not null default 5 check (star_rating between 1 and 5),
  avatar_url text not null default '',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  is_archived boolean not null default false,
  is_approved boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists testimonials_hotel_slug_idx
  on public.testimonials (hotel_slug);

create index if not exists testimonials_hotel_slug_sort_order_idx
  on public.testimonials (hotel_slug, sort_order, created_at desc);

create index if not exists testimonials_visibility_idx
  on public.testimonials (hotel_slug, is_active, is_archived, is_approved);
