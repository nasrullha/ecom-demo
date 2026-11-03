-- =============================================================================
-- Store database schema for Supabase
-- Run this ONCE in: Supabase Dashboard -> SQL Editor -> New query -> Run
--
-- What it creates
--   * tables: profiles, categories, products, product_variants, product_images,
--             store_settings, orders, order_items, order_events
--   * Row Level Security (RLS) on every table: customers can only see their own
--     data, only admins can change the catalog
--   * server-side functions that place orders, check stock, attach payment slips
--     and change order status (the browser can never set prices or statuses)
--   * two storage buckets: product-images (public) and payment-slips (private)
-- =============================================================================

create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;

-- -----------------------------------------------------------------------------
-- Types
-- -----------------------------------------------------------------------------
do $$ begin
  create type public.order_status as enum
    ('pending', 'slip_uploaded', 'approved', 'delivered', 'rejected');
exception when duplicate_object then null; end $$;

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- -----------------------------------------------------------------------------
-- Profiles (one row per signed-up user; role decides admin access)
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text check (full_name is null or char_length(full_name) <= 100),
  phone       text check (phone is null or char_length(phone) <= 30),
  role        text not null default 'customer' check (role in ('customer', 'admin')),
  created_at  timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    nullif(left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 100), '')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Nobody can promote themselves. Roles can only be changed from the SQL editor
-- (where there is no signed-in user) or with the service role key.
create or replace function public.protect_profile_role()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.role is distinct from old.role and (select auth.uid()) is not null then
    raise exception 'Role cannot be changed from the app' using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

-- -----------------------------------------------------------------------------
-- Catalog
-- -----------------------------------------------------------------------------
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 80),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 100),
  description text check (description is null or char_length(description) <= 500),
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.products (
  id               uuid primary key default gen_random_uuid(),
  category_id      uuid references public.categories (id) on delete set null,
  name             text not null check (char_length(name) between 1 and 160),
  slug             text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 180),
  brand            text check (brand is null or char_length(brand) <= 80),
  description      text check (description is null or char_length(description) <= 5000),
  price            numeric(12, 2) not null check (price >= 0 and price < 100000000),
  compare_at_price numeric(12, 2) check (compare_at_price is null or compare_at_price >= price),
  option_names     text[] not null default '{}' check (cardinality(option_names) <= 3),
  is_active        boolean not null default true,
  is_featured      boolean not null default false,
  search_text      text generated always as (
                     lower(name || ' ' || coalesce(brand, '') || ' ' || coalesce(description, ''))
                   ) stored,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists products_category_idx on public.products (category_id);
create index if not exists products_active_created_idx on public.products (is_active, created_at desc);
create index if not exists products_search_trgm_idx
  on public.products using gin (search_text extensions.gin_trgm_ops);

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

create table if not exists public.product_variants (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  sku        text unique check (sku is null or char_length(sku) <= 64),
  name       text not null default 'Default' check (char_length(name) between 1 and 120),
  options    jsonb not null default '{}'::jsonb check (jsonb_typeof(options) = 'object'),
  price      numeric(12, 2) check (price is null or (price >= 0 and price < 100000000)),
  stock      integer not null default 0 check (stock >= 0 and stock <= 1000000),
  is_active  boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists product_variants_product_idx on public.product_variants (product_id);

create table if not exists public.product_images (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  path       text not null,            -- path inside the product-images bucket
  alt        text check (alt is null or char_length(alt) <= 200),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists product_images_product_idx on public.product_images (product_id, sort_order);

-- -----------------------------------------------------------------------------
-- Store settings (single row, edited from Admin -> Settings)
-- -----------------------------------------------------------------------------
create table if not exists public.store_settings (
  id                      boolean primary key default true check (id),
  store_name              text not null default 'My Store' check (char_length(store_name) <= 80),
  bank_name               text check (bank_name is null or char_length(bank_name) <= 100),
  account_name            text check (account_name is null or char_length(account_name) <= 100),
  account_number          text check (account_number is null or char_length(account_number) <= 60),
  payment_instructions    text check (payment_instructions is null or char_length(payment_instructions) <= 1000),
  shipping_fee            numeric(12, 2) not null default 0 check (shipping_fee >= 0),
  free_shipping_threshold numeric(12, 2) check (free_shipping_threshold is null or free_shipping_threshold >= 0),
  low_stock_threshold     integer not null default 5 check (low_stock_threshold >= 0),
  updated_at              timestamptz not null default now()
);

insert into public.store_settings (id) values (true) on conflict (id) do nothing;

drop trigger if exists store_settings_set_updated_at on public.store_settings;
create trigger store_settings_set_updated_at
  before update on public.store_settings
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Orders
-- -----------------------------------------------------------------------------
create sequence if not exists public.order_number_seq start 1001;

create table if not exists public.orders (
  id                   uuid primary key default gen_random_uuid(),
  order_number         text not null unique default ('ORD-' || nextval('public.order_number_seq')::text),
  user_id              uuid not null references public.profiles (id) on delete restrict,
  status               public.order_status not null default 'pending',
  subtotal             numeric(12, 2) not null default 0,
  shipping_fee         numeric(12, 2) not null default 0,
  total                numeric(12, 2) not null default 0,
  shipping_name        text not null check (char_length(shipping_name) between 1 and 100),
  shipping_phone       text not null check (char_length(shipping_phone) between 3 and 30),
  shipping_address     text not null check (char_length(shipping_address) between 1 and 300),
  shipping_city        text not null check (char_length(shipping_city) between 1 and 100),
  shipping_postal_code text check (shipping_postal_code is null or char_length(shipping_postal_code) <= 20),
  customer_note        text check (customer_note is null or char_length(customer_note) <= 500),
  slip_path            text,           -- path inside the payment-slips bucket
  slip_uploaded_at     timestamptz,
  admin_note           text check (admin_note is null or char_length(admin_note) <= 500),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- Maldives delivery details (added after the first release; safe to re-run)
alter table public.orders add column if not exists shipping_atoll text check (shipping_atoll is null or char_length(shipping_atoll) <= 60);
alter table public.orders add column if not exists delivery_method text not null default 'courier' check (delivery_method in ('courier', 'vessel'));
alter table public.orders add column if not exists preferred_vessel text check (preferred_vessel is null or char_length(preferred_vessel) <= 100);
alter table public.orders add column if not exists vessel_name text check (vessel_name is null or char_length(vessel_name) <= 100);
alter table public.orders add column if not exists dispatch_note text check (dispatch_note is null or char_length(dispatch_note) <= 300);

create index if not exists orders_user_idx on public.orders (user_id, created_at desc);
create index if not exists orders_status_idx on public.orders (status, created_at desc);

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

create table if not exists public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders (id) on delete cascade,
  product_id    uuid references public.products (id) on delete set null,
  variant_id    uuid references public.product_variants (id) on delete set null,
  product_name  text not null,
  variant_name  text,
  sku           text,
  image_path    text,
  unit_price    numeric(12, 2) not null check (unit_price >= 0),
  quantity      integer not null check (quantity between 1 and 99),
  line_total    numeric(12, 2) generated always as (unit_price * quantity) stored
);

create index if not exists order_items_order_idx on public.order_items (order_id);

create table if not exists public.order_events (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders (id) on delete cascade,
  from_status public.order_status,
  to_status   public.order_status not null,
  note        text,
  actor_id    uuid,
  created_at  timestamptz not null default now()
);

create index if not exists order_events_order_idx on public.order_events (order_id, created_at);

-- -----------------------------------------------------------------------------
-- Views used by the storefront (they respect Row Level Security)
-- -----------------------------------------------------------------------------
create or replace view public.product_listing
with (security_invoker = true) as
select
  p.id, p.name, p.slug, p.brand, p.description, p.price, p.compare_at_price,
  p.is_active, p.is_featured, p.created_at, p.search_text, p.category_id,
  c.slug as category_slug,
  c.name as category_name,
  coalesce(s.min_price, p.price) as min_price,
  coalesce(s.max_price, p.price) as max_price,
  coalesce(s.total_stock, 0)::integer as total_stock,
  im.path as image_path,
  im.path2 as image_path_2,
  coalesce(ov.option_values, '{}'::text[]) as option_values
from public.products p
left join public.categories c on c.id = p.category_id
left join lateral (
  select
    min(coalesce(v.price, p.price)) as min_price,
    max(coalesce(v.price, p.price)) as max_price,
    sum(v.stock) as total_stock
  from public.product_variants v
  where v.product_id = p.id and v.is_active
) s on true
left join lateral (
  select array_agg(distinct o.key || ':' || o.value) as option_values
  from public.product_variants v
  cross join lateral jsonb_each_text(v.options) o
  where v.product_id = p.id and v.is_active
) ov on true
left join lateral (
  select
    (array_agg(pi.path order by pi.sort_order, pi.created_at))[1] as path,
    (array_agg(pi.path order by pi.sort_order, pi.created_at))[2] as path2
  from public.product_images pi
  where pi.product_id = p.id
) im on true;

create or replace view public.product_option_facets
with (security_invoker = true) as
select
  o.key   as option_name,
  o.value as option_value,
  count(distinct v.product_id)::integer as product_count
from public.product_variants v
join public.products p on p.id = v.product_id and p.is_active
cross join lateral jsonb_each_text(v.options) o
where v.is_active
group by o.key, o.value;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.profiles         enable row level security;
alter table public.categories       enable row level security;
alter table public.products         enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images   enable row level security;
alter table public.store_settings   enable row level security;
alter table public.orders           enable row level security;
alter table public.order_items      enable row level security;
alter table public.order_events     enable row level security;

-- Start from zero permissions, then grant only what is needed.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

grant select on public.categories, public.products, public.product_variants,
                public.product_images, public.store_settings,
                public.product_listing, public.product_option_facets
  to anon, authenticated;
grant insert, update, delete on public.categories, public.products,
                public.product_variants, public.product_images to authenticated;
grant update on public.store_settings to authenticated;
grant select on public.profiles, public.orders, public.order_items, public.order_events
  to authenticated;
-- customers may edit only these two columns of their own profile
grant update (full_name, phone) on public.profiles to authenticated;

-- profiles
drop policy if exists "profiles: read own or admin" on public.profiles;
create policy "profiles: read own or admin" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- catalog: everyone reads active items, admins read/write everything
drop policy if exists "categories: read" on public.categories;
create policy "categories: read" on public.categories
  for select using (true);
drop policy if exists "categories: admin write" on public.categories;
create policy "categories: admin write" on public.categories
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "products: read active" on public.products;
create policy "products: read active" on public.products
  for select using (is_active or (select public.is_admin()));
drop policy if exists "products: admin write" on public.products;
create policy "products: admin write" on public.products
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "variants: read active" on public.product_variants;
create policy "variants: read active" on public.product_variants
  for select using (
    (is_active and exists (
      select 1 from public.products p where p.id = product_id and p.is_active
    ))
    or (select public.is_admin())
  );
drop policy if exists "variants: admin write" on public.product_variants;
create policy "variants: admin write" on public.product_variants
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "images: read active" on public.product_images;
create policy "images: read active" on public.product_images
  for select using (
    exists (select 1 from public.products p where p.id = product_id and p.is_active)
    or (select public.is_admin())
  );
drop policy if exists "images: admin write" on public.product_images;
create policy "images: admin write" on public.product_images
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- settings
drop policy if exists "settings: read" on public.store_settings;
create policy "settings: read" on public.store_settings
  for select using (true);
drop policy if exists "settings: admin update" on public.store_settings;
create policy "settings: admin update" on public.store_settings
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- orders: read-only from the app. All changes go through the functions below.
drop policy if exists "orders: read own or admin" on public.orders;
create policy "orders: read own or admin" on public.orders
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "order_items: read own or admin" on public.order_items;
create policy "order_items: read own or admin" on public.order_items
  for select to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = order_id and (o.user_id = (select auth.uid()) or (select public.is_admin()))
  ));

drop policy if exists "order_events: read own or admin" on public.order_events;
create policy "order_events: read own or admin" on public.order_events
  for select to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = order_id and (o.user_id = (select auth.uid()) or (select public.is_admin()))
  ));

-- -----------------------------------------------------------------------------
-- Order functions (security definer = they run with owner rights, but check
-- who is calling and never trust prices or totals sent from the browser)
-- -----------------------------------------------------------------------------

-- Put stock back for every line of an order (used on reject / cancel / expire)
create or replace function public.restore_order_stock(p_order_id uuid)
returns void language sql security definer set search_path = '' as $$
  update public.product_variants v
  set stock = v.stock + oi.quantity
  from public.order_items oi
  where oi.order_id = p_order_id and oi.variant_id = v.id;
$$;

-- Place an order. p_items = [{"variant_id": "...", "quantity": 2}, ...]
create or replace function public.create_order(p_items jsonb, p_shipping jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid       uuid := (select auth.uid());
  v_order_id  uuid;
  v_settings  public.store_settings%rowtype;
  v_line      record;
  v_var       record;
  v_unit      numeric(12, 2);
  v_subtotal  numeric(12, 2) := 0;
  v_fee       numeric(12, 2);
  v_open      integer;
  v_name      text := btrim(coalesce(p_shipping ->> 'name', ''));
  v_phone     text := btrim(coalesce(p_shipping ->> 'phone', ''));
  v_address   text := btrim(coalesce(p_shipping ->> 'address', ''));
  v_city      text := btrim(coalesce(p_shipping ->> 'city', ''));
  v_postal    text := nullif(btrim(coalesce(p_shipping ->> 'postal_code', '')), '');
  v_note      text := nullif(btrim(coalesce(p_shipping ->> 'note', '')), '');
  v_atoll     text := btrim(coalesce(p_shipping ->> 'atoll', ''));
  v_method    text := coalesce(nullif(btrim(coalesce(p_shipping ->> 'delivery_method', '')), ''), 'courier');
  v_vessel    text := nullif(btrim(coalesce(p_shipping ->> 'vessel', '')), '');
begin
  if v_uid is null then
    raise exception 'Please sign in to place an order.' using errcode = '28000';
  end if;

  if char_length(v_name) not between 1 and 100
     or char_length(v_phone) not between 3 and 30
     or char_length(v_address) not between 1 and 300
     or char_length(v_city) not between 1 and 100
     or char_length(coalesce(v_postal, '')) > 20
     or char_length(coalesce(v_note, '')) > 500
     or char_length(v_atoll) not between 1 and 60
     or v_method not in ('courier', 'vessel')
     or char_length(coalesce(v_vessel, '')) > 100 then
    raise exception 'Please check your delivery details.';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) not between 1 and 50 then
    raise exception 'Your cart is empty or invalid.';
  end if;

  -- stop one account from locking up all the stock with unpaid orders
  select count(*) into v_open
  from public.orders
  where user_id = v_uid and status = 'pending' and created_at > now() - interval '3 days';
  if v_open >= 5 then
    raise exception 'You have several unpaid orders. Please pay or cancel them before placing a new one.';
  end if;

  select * into v_settings from public.store_settings limit 1;

  insert into public.orders (user_id, shipping_name, shipping_phone, shipping_address,
                             shipping_city, shipping_postal_code, customer_note,
                             shipping_atoll, delivery_method, preferred_vessel)
  values (v_uid, v_name, v_phone, v_address, v_city, v_postal, v_note,
          v_atoll, v_method, v_vessel)
  returning id into v_order_id;

  -- merge duplicate lines, lock rows in a stable order to avoid deadlocks
  for v_line in
    select (e ->> 'variant_id')::uuid as variant_id,
           sum((e ->> 'quantity')::integer) as qty
    from jsonb_array_elements(p_items) e
    group by 1
    order by 1
  loop
    if v_line.qty < 1 or v_line.qty > 99 then
      raise exception 'Quantity must be between 1 and 99.';
    end if;

    select v.id, v.product_id, v.name as variant_name, v.sku, v.price as variant_price,
           v.stock, v.is_active as variant_active,
           p.name as product_name, p.price as base_price, p.is_active as product_active,
           (select pi.path from public.product_images pi
             where pi.product_id = p.id order by pi.sort_order, pi.created_at limit 1) as image_path
      into v_var
    from public.product_variants v
    join public.products p on p.id = v.product_id
    where v.id = v_line.variant_id
    for update of v;

    if not found or not v_var.variant_active or not v_var.product_active then
      raise exception 'One of the items in your cart is no longer available.';
    end if;

    if v_var.stock < v_line.qty then
      raise exception 'Only % left of "%" (%).', v_var.stock, v_var.product_name, v_var.variant_name;
    end if;

    update public.product_variants set stock = stock - v_line.qty where id = v_var.id;

    v_unit := coalesce(v_var.variant_price, v_var.base_price);

    insert into public.order_items (order_id, product_id, variant_id, product_name,
                                    variant_name, sku, image_path, unit_price, quantity)
    values (v_order_id, v_var.product_id, v_var.id, v_var.product_name,
            v_var.variant_name, v_var.sku, v_var.image_path, v_unit, v_line.qty);

    v_subtotal := v_subtotal + v_unit * v_line.qty;
  end loop;

  if v_settings.free_shipping_threshold is not null
     and v_subtotal >= v_settings.free_shipping_threshold then
    v_fee := 0;
  else
    v_fee := coalesce(v_settings.shipping_fee, 0);
  end if;

  update public.orders
  set subtotal = v_subtotal, shipping_fee = v_fee, total = v_subtotal + v_fee
  where id = v_order_id;

  insert into public.order_events (order_id, from_status, to_status, note, actor_id)
  values (v_order_id, null, 'pending', 'Order placed', v_uid);

  return v_order_id;
end $$;

-- Customer finished uploading a payment slip to storage: record it on the order.
create or replace function public.attach_payment_slip(p_order_id uuid, p_path text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid    uuid := (select auth.uid());
  v_order  public.orders%rowtype;
begin
  if v_uid is null then
    raise exception 'Please sign in.' using errcode = '28000';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.user_id <> v_uid then
    raise exception 'Order not found.';
  end if;
  if v_order.status not in ('pending', 'slip_uploaded') then
    raise exception 'A payment slip can no longer be uploaded for this order.';
  end if;
  if p_path is null or p_path not like (v_uid::text || '/' || p_order_id::text || '/%') then
    raise exception 'Invalid file path.';
  end if;
  if not exists (
    select 1 from storage.objects where bucket_id = 'payment-slips' and name = p_path
  ) then
    raise exception 'The uploaded file could not be found. Please try again.';
  end if;

  update public.orders
  set slip_path = p_path, slip_uploaded_at = now(), status = 'slip_uploaded'
  where id = p_order_id;

  insert into public.order_events (order_id, from_status, to_status, note, actor_id)
  values (p_order_id, v_order.status, 'slip_uploaded', 'Payment slip uploaded', v_uid);
end $$;

-- Customer cancels an order they have not paid for yet.
create or replace function public.cancel_my_order(p_order_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid   uuid := (select auth.uid());
  v_order public.orders%rowtype;
begin
  if v_uid is null then
    raise exception 'Please sign in.' using errcode = '28000';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.user_id <> v_uid then
    raise exception 'Order not found.';
  end if;
  if v_order.status <> 'pending' then
    raise exception 'Only orders without a payment slip can be cancelled.';
  end if;

  perform public.restore_order_stock(p_order_id);
  update public.orders set status = 'rejected', admin_note = 'Cancelled by customer'
  where id = p_order_id;
  insert into public.order_events (order_id, from_status, to_status, note, actor_id)
  values (p_order_id, 'pending', 'rejected', 'Cancelled by customer', v_uid);
end $$;

-- Admin moves an order along: pending -> slip_uploaded -> approved -> delivered
-- (or rejected). Rejecting puts the stock back.
create or replace function public.admin_update_order_status(
  p_order_id uuid, p_status public.order_status, p_note text default null
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid   uuid := (select auth.uid());
  v_order public.orders%rowtype;
  v_note  text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if not public.is_admin() then
    raise exception 'Not allowed.' using errcode = '42501';
  end if;
  if v_note is not null and char_length(v_note) > 500 then
    raise exception 'The note is too long (500 characters max).';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found.';
  end if;

  if not (
       (v_order.status = 'pending'       and p_status = 'rejected')
    or (v_order.status = 'slip_uploaded' and p_status in ('approved', 'rejected'))
    or (v_order.status = 'approved'      and p_status in ('delivered', 'rejected'))
  ) then
    raise exception 'An order that is "%" cannot be changed to "%".', v_order.status, p_status;
  end if;

  if p_status = 'rejected' then
    perform public.restore_order_stock(p_order_id);
  end if;

  update public.orders
  set status = p_status, admin_note = coalesce(v_note, admin_note)
  where id = p_order_id;

  insert into public.order_events (order_id, from_status, to_status, note, actor_id)
  values (p_order_id, v_order.status, p_status, v_note, v_uid);
end $$;

-- Admin records which vessel (or courier) an order left on. The customer sees it.
create or replace function public.admin_set_dispatch(p_order_id uuid, p_vessel text, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_vessel text := nullif(btrim(coalesce(p_vessel, '')), '');
  v_note   text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if not public.is_admin() then
    raise exception 'Not allowed.' using errcode = '42501';
  end if;
  if char_length(coalesce(v_vessel, '')) > 100 or char_length(coalesce(v_note, '')) > 300 then
    raise exception 'The vessel name or note is too long.';
  end if;
  update public.orders set vessel_name = v_vessel, dispatch_note = v_note where id = p_order_id;
  if not found then
    raise exception 'Order not found.';
  end if;
  insert into public.order_events (order_id, from_status, to_status, note, actor_id)
  select id, status, status, 'Delivery details: ' || coalesce(v_vessel, 'no vessel') || coalesce(' - ' || v_note, ''), (select auth.uid())
  from public.orders where id = p_order_id;
end $$;

-- Release stock held by orders that were never paid. Admin button on the
-- Orders page calls this; it can also be scheduled (see bottom of this file).
create or replace function public.expire_stale_orders(p_hours integer default 72)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_order record;
  v_count integer := 0;
begin
  if (select auth.uid()) is not null and not public.is_admin() then
    raise exception 'Not allowed.' using errcode = '42501';
  end if;
  if p_hours is null or p_hours < 1 then
    raise exception 'Hours must be at least 1.';
  end if;

  for v_order in
    select id from public.orders
    where status = 'pending' and slip_path is null
      and created_at < now() - make_interval(hours => p_hours)
    for update
  loop
    perform public.restore_order_stock(v_order.id);
    update public.orders set status = 'rejected', admin_note = 'Expired: no payment received'
    where id = v_order.id;
    insert into public.order_events (order_id, from_status, to_status, note)
    values (v_order.id, 'pending', 'rejected', 'Expired: no payment received');
    v_count := v_count + 1;
  end loop;

  return v_count;
end $$;

-- Dashboard numbers for the admin home page
create or replace function public.admin_dashboard_stats()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_low    integer;
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Not allowed.' using errcode = '42501';
  end if;

  select low_stock_threshold into v_low from public.store_settings limit 1;

  select jsonb_build_object(
    'revenue_total', coalesce((select sum(total) from public.orders
                                where status in ('approved', 'delivered')), 0),
    'revenue_30d',   coalesce((select sum(total) from public.orders
                                where status in ('approved', 'delivered')
                                  and created_at >= now() - interval '30 days'), 0),
    'orders_total',  (select count(*) from public.orders),
    'orders_by_status', coalesce((
      select jsonb_object_agg(s.status::text, s.c)
      from (select status, count(*) as c from public.orders group by status) s
    ), '{}'::jsonb),
    'products_total',  (select count(*) from public.products),
    'products_active', (select count(*) from public.products where is_active),
    'customers_total', (select count(*) from public.profiles where role = 'customer'),
    'low_stock', coalesce((
      select jsonb_agg(x)
      from (
        select p.id as product_id, p.name as product_name, v.name as variant_name, v.stock
        from public.product_variants v
        join public.products p on p.id = v.product_id
        where v.is_active and p.is_active and v.stock <= v_low
        order by v.stock, p.name
        limit 10
      ) x
    ), '[]'::jsonb),
    'daily', (
      select jsonb_agg(
        jsonb_build_object('date', d.day, 'revenue', coalesce(r.rev, 0), 'orders', coalesce(r.cnt, 0))
        order by d.day
      )
      from (select generate_series(current_date - 13, current_date, interval '1 day')::date as day) d
      left join (
        select created_at::date as day,
               sum(total) filter (where status in ('approved', 'delivered')) as rev,
               count(*) as cnt
        from public.orders
        where created_at >= current_date - 13
        group by 1
      ) r on r.day = d.day
    )
  ) into v_result;

  return v_result;
end $$;

-- Who may call what
revoke execute on all functions in schema public from public, anon;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.create_order(jsonb, jsonb) to authenticated;
grant execute on function public.attach_payment_slip(uuid, text) to authenticated;
grant execute on function public.cancel_my_order(uuid) to authenticated;
grant execute on function public.admin_update_order_status(uuid, public.order_status, text) to authenticated;
grant execute on function public.expire_stale_orders(integer) to authenticated;
grant execute on function public.admin_dashboard_stats() to authenticated;
grant execute on function public.admin_set_dispatch(uuid, text, text) to authenticated;
-- internal helpers: not callable from the app at all
revoke execute on function public.restore_order_stock(uuid) from authenticated;
revoke execute on function public.handle_new_user() from authenticated;
revoke execute on function public.protect_profile_role() from authenticated;
revoke execute on function public.set_updated_at() from authenticated;

-- -----------------------------------------------------------------------------
-- Storage buckets (images are stored here, NOT in the database)
--   product-images : public, small WebP files (the app compresses every upload)
--   payment-slips  : private, readable only by the customer and admins
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', true,  1048576, array['image/webp', 'image/jpeg', 'image/png']),
  ('payment-slips',  'payment-slips',  false, 2097152, array['image/webp', 'image/jpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- product images: public files are served by URL; only admins can add/remove
drop policy if exists "product-images: admin read" on storage.objects;
create policy "product-images: admin read" on storage.objects
  for select to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()));

drop policy if exists "product-images: admin insert" on storage.objects;
create policy "product-images: admin insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and (select public.is_admin()));

drop policy if exists "product-images: admin update" on storage.objects;
create policy "product-images: admin update" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()));

drop policy if exists "product-images: admin delete" on storage.objects;
create policy "product-images: admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()));

-- payment slips: files live in <user id>/<order id>/<file>
drop policy if exists "payment-slips: owner or admin read" on storage.objects;
create policy "payment-slips: owner or admin read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'payment-slips'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin()))
  );

drop policy if exists "payment-slips: owner insert" on storage.objects;
create policy "payment-slips: owner insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'payment-slips'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "payment-slips: owner or admin delete" on storage.objects;
create policy "payment-slips: owner or admin delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'payment-slips'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin()))
  );

-- -----------------------------------------------------------------------------
-- OPTIONAL: release stock from unpaid orders automatically every hour.
-- Needs the pg_cron extension (Dashboard -> Database -> Extensions -> pg_cron).
-- Uncomment, then run.
-- -----------------------------------------------------------------------------
-- select cron.schedule('expire-unpaid-orders', '0 * * * *',
--                      $$select public.expire_stale_orders(72)$$);

-- -----------------------------------------------------------------------------
-- AFTER you register on your site, make yourself an admin by running:
--   update public.profiles set role = 'admin' where email = 'you@example.com';
-- -----------------------------------------------------------------------------
