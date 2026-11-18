/*
 * Allow staff to return inventory even when the Inventory Room
 * has never been physically counted for that variant.
 *
 * Rules:
 * - Cadet inventory decreases by the returned quantity.
 * - Room inventory increases by the returned quantity.
 * - If no room_inventory row exists, create one.
 * - A return does not count as a physical inventory count.
 * - last_counted_at remains NULL until an actual count is entered.
 */

create or replace function public.return_inventory_from_cadet(
  p_cadet_id uuid,
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
  v_actor uuid;

  v_inventory_id uuid;
  v_cadet_before integer;
  v_cadet_after integer;

  v_room_before integer;
  v_room_after integer;
begin
  v_actor := auth.uid();

  if v_actor is null then
    raise exception 'You must be signed in.';
  end if;

  if not (
    public.has_role('inventory_admin')
    or public.has_role('inventory_assistant')
  ) then
    raise exception 'You do not have permission to return inventory.';
  end if;

  if p_quantity is null or p_quantity < 1 then
    raise exception 'Quantity must be at least 1.';
  end if;

  /*
   * Lock cadet holding.
   */
  select id, quantity
  into v_inventory_id, v_cadet_before
  from public.cadet_inventory
  where cadet_id = p_cadet_id
    and catalog_variant_id = p_catalog_variant_id
  for update;

  if not found then
    raise exception
      'Cadet does not have this inventory variant.';
  end if;

  if v_cadet_before < p_quantity then
    raise exception
      'Cadet only has % of this variant. Cannot return %.',
      v_cadet_before,
      p_quantity;
  end if;

  v_cadet_after :=
    v_cadet_before - p_quantity;

  /*
   * Reduce/remove cadet holding.
   */
  if v_cadet_after = 0 then
    delete from public.cadet_inventory
    where id = v_inventory_id;
  else
    update public.cadet_inventory
    set quantity = v_cadet_after
    where id = v_inventory_id;
  end if;

  /*
   * Add returned inventory to room stock.
   *
   * If the variant has never been counted,
   * create the room row.
   *
   * last_counted_at is intentionally not set.
   */
  insert into public.room_inventory as ri (
    catalog_variant_id,
    quantity_on_hand,
    updated_at,
    updated_by
  )
  values (
    p_catalog_variant_id,
    p_quantity,
    now(),
    v_actor
  )
  on conflict (catalog_variant_id)
  do update
  set
    quantity_on_hand =
      ri.quantity_on_hand +
      excluded.quantity_on_hand,
    updated_at = now(),
    updated_by = v_actor
  returning
    quantity_on_hand - p_quantity,
    quantity_on_hand
  into
    v_room_before,
    v_room_after;

  /*
   * Audit event.
   */
  insert into public.room_inventory_events (
    catalog_variant_id,
    event_type,
    quantity_before,
    quantity_after,
    quantity_delta,
    cadet_id,
    actor_profile_id,
    notes
  )
  values (
    p_catalog_variant_id,
    'return',
    v_room_before,
    v_room_after,
    p_quantity,
    p_cadet_id,
    v_actor,
    nullif(trim(p_notes), '')
  );
end;
$$;

revoke all
on function public.return_inventory_from_cadet(
  uuid,
  uuid,
  integer,
  text
)
from public;

grant execute
on function public.return_inventory_from_cadet(
  uuid,
  uuid,
  integer,
  text
)
to authenticated;