-- ============================================================
-- Det 055 Inventory
-- Inventory Room / Full Inventory Foundation
-- ============================================================

-- ------------------------------------------------------------
-- Current quantity physically located in the inventory room.
--
-- Cadet-issued inventory remains stored in cadet_inventory.
-- Full accounted inventory is:
--
-- room_inventory.quantity_on_hand
-- + SUM(cadet_inventory.quantity)
-- ------------------------------------------------------------

create table public.room_inventory (
  catalog_variant_id uuid primary key
    references public.catalog_variants(id)
    on delete cascade,

  quantity_on_hand integer not null default 0
    check (quantity_on_hand >= 0),

  last_counted_at timestamptz,

  updated_at timestamptz not null default now(),

  updated_by uuid
    references public.profiles(id)
    on delete set null
);


-- ------------------------------------------------------------
-- Audit history for physical room inventory.
--
-- This is intentionally separate from cadet inventory history.
-- Later, issue and return transactions can link both systems.
-- ------------------------------------------------------------

create table public.room_inventory_events (
  id uuid primary key default gen_random_uuid(),

  catalog_variant_id uuid not null
    references public.catalog_variants(id)
    on delete restrict,

  event_type text not null
    check (
      event_type in (
        'physical_count',
        'adjustment',
        'issue',
        'return',
        'loss',
        'correction'
      )
    ),

  quantity_before integer not null
    check (quantity_before >= 0),

  quantity_after integer not null
    check (quantity_after >= 0),

  quantity_delta integer not null,

  cadet_id uuid
    references public.cadets(id)
    on delete set null,

  actor_profile_id uuid
    references public.profiles(id)
    on delete set null,

  notes text,

  created_at timestamptz not null default now()
);


create index room_inventory_events_variant_idx
  on public.room_inventory_events(catalog_variant_id);

create index room_inventory_events_cadet_idx
  on public.room_inventory_events(cadet_id);

create index room_inventory_events_created_at_idx
  on public.room_inventory_events(created_at desc);


-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------

alter table public.room_inventory
  enable row level security;

alter table public.room_inventory_events
  enable row level security;


-- Inventory Admin, Inventory Assistant, and Cadre can view
-- physical inventory.
create policy "staff can view room inventory"
on public.room_inventory
for select
to authenticated
using (
  public.has_role('inventory_admin')
  or public.has_role('inventory_assistant')
  or public.has_role('cadre')
);


-- Same read access for room inventory history.
create policy "staff can view room inventory events"
on public.room_inventory_events
for select
to authenticated
using (
  public.has_role('inventory_admin')
  or public.has_role('inventory_assistant')
  or public.has_role('cadre')
);


-- ------------------------------------------------------------
-- RPC: record/set a physical inventory count.
--
-- Only Inventory Admin and Inventory Assistant may perform
-- physical counts.
--
-- This keeps the balance change and audit record atomic.
-- ------------------------------------------------------------

create or replace function public.set_room_inventory_count(
  p_catalog_variant_id uuid,
  p_quantity integer,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_before integer;
  v_variant_exists boolean;
begin

  if v_actor is null then
    raise exception 'Authentication required.';
  end if;


  if not (
    public.has_role('inventory_admin')
    or public.has_role('inventory_assistant')
  ) then
    raise exception
      'You do not have permission to modify room inventory.';
  end if;


  if p_quantity is null or p_quantity < 0 then
    raise exception
      'Inventory quantity must be zero or greater.';
  end if;


  -- Make sure this is an active catalog variant
  -- belonging to an active application item.
  select exists (
    select 1
    from public.catalog_variants cv
    join public.app_items ai
      on ai.id = cv.app_item_id
    where cv.id = p_catalog_variant_id
      and cv.active = true
      and ai.active = true
  )
  into v_variant_exists;


  if not v_variant_exists then
    raise exception
      'The selected catalog variant is invalid or inactive.';
  end if;


  -- Ensure a room inventory row exists.
  insert into public.room_inventory (
    catalog_variant_id,
    quantity_on_hand,
    updated_by
  )
  values (
    p_catalog_variant_id,
    0,
    v_actor
  )
  on conflict (catalog_variant_id)
  do nothing;


  -- Lock the current balance while we update it.
  select quantity_on_hand
  into v_before
  from public.room_inventory
  where catalog_variant_id = p_catalog_variant_id
  for update;


  update public.room_inventory
  set
    quantity_on_hand = p_quantity,
    last_counted_at = now(),
    updated_at = now(),
    updated_by = v_actor
  where catalog_variant_id = p_catalog_variant_id;


  -- Record the physical count even if the quantity did not change.
  -- That gives us evidence that the item was actually counted.
  insert into public.room_inventory_events (
    catalog_variant_id,
    event_type,
    quantity_before,
    quantity_after,
    quantity_delta,
    actor_profile_id,
    notes
  )
  values (
    p_catalog_variant_id,
    'physical_count',
    v_before,
    p_quantity,
    p_quantity - v_before,
    v_actor,
    nullif(trim(p_notes), '')
  );

end;
$$;


revoke all
on function public.set_room_inventory_count(uuid, integer, text)
from public;

grant execute
on function public.set_room_inventory_count(uuid, integer, text)
to authenticated;


-- ------------------------------------------------------------
-- Live Full Inventory View
--
-- This provides one row per active catalog variant showing:
--
-- Inventory Room
-- Issued to Cadets
-- Total Accounted
-- Number of Cadets Holding Item
-- ------------------------------------------------------------

create view public.inventory_variant_summary
with (security_invoker = true)
as
select
  cv.id as catalog_variant_id,

  ai.id as app_item_id,

  ai.uniform_category,

  ai.display_name,

  cv.cut,

  cv.size_display,

  cv.size_code,

  coalesce(
    ri.quantity_on_hand,
    0
  )::integer as room_quantity,

  coalesce(
    issued.issued_quantity,
    0
  )::integer as issued_quantity,

  (
    coalesce(
      ri.quantity_on_hand,
      0
    )
    +
    coalesce(
      issued.issued_quantity,
      0
    )
  )::integer as total_accounted_quantity,

  coalesce(
    issued.cadet_count,
    0
  )::integer as cadet_count,

  ri.last_counted_at,

  ri.updated_at as room_updated_at

from public.catalog_variants cv

join public.app_items ai
  on ai.id = cv.app_item_id

left join public.room_inventory ri
  on ri.catalog_variant_id = cv.id

left join (
  select
    catalog_variant_id,

    sum(quantity) as issued_quantity,

    count(distinct cadet_id) as cadet_count

  from public.cadet_inventory

  group by catalog_variant_id
) issued
  on issued.catalog_variant_id = cv.id

where
  cv.active = true
  and ai.active = true;


grant select
on public.inventory_variant_summary
to authenticated;


comment on table public.room_inventory is
  'Current physical quantity of each catalog variant located in the Detachment inventory room.';

comment on table public.room_inventory_events is
  'Audit history of physical inventory room counts and future stock movements.';

comment on view public.inventory_variant_summary is
  'Live inventory summary combining physical room stock with cadet-issued inventory.';