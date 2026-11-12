/*
 * Allow staff to issue inventory even when the Inventory Room
 * does not currently have enough recorded stock.
 *
 * Rules:
 * - Cadet inventory always receives the requested quantity.
 * - Room inventory decreases only by what is actually available.
 * - Room inventory never drops below zero.
 * - An uncounted variant does not require a room_inventory row.
 * - Issuance is still recorded in room_inventory_events.
 */

create or replace function public.issue_inventory_to_cadet(
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

  v_room_exists boolean := false;
  v_room_before integer := 0;
  v_room_after integer := 0;
  v_room_delta integer := 0;

  v_inventory_id uuid;
  v_cadet_before integer;
  v_cadet_after integer;
begin
  v_actor := auth.uid();

  if v_actor is null then
    raise exception 'You must be signed in.';
  end if;

  if not (
    public.has_role('inventory_admin')
    or public.has_role('inventory_assistant')
  ) then
    raise exception 'You do not have permission to issue inventory.';
  end if;

  if p_quantity is null or p_quantity < 1 then
    raise exception 'Quantity must be at least 1.';
  end if;

  /*
   * Confirm cadet exists.
   */
  if not exists (
    select 1
    from public.cadets
    where id = p_cadet_id
  ) then
    raise exception 'Cadet could not be found.';
  end if;

  /*
   * Confirm catalog variant and parent item
   * are both active.
   */
  if not exists (
    select 1
    from public.catalog_variants cv
    join public.app_items ai
      on ai.id = cv.app_item_id
    where cv.id = p_catalog_variant_id
      and cv.active = true
      and ai.active = true
  ) then
    raise exception 'Selected inventory variant is invalid or inactive.';
  end if;

  /*
   * Lock the room row if one exists.
   *
   * A missing room row no longer prevents issuance.
   */
  select quantity_on_hand
  into v_room_before
  from public.room_inventory
  where catalog_variant_id = p_catalog_variant_id
  for update;

  v_room_exists := found;

  if v_room_exists then
    /*
     * Consume only the stock that actually exists.
     * Never allow the room count to become negative.
     */
    v_room_after :=
      greatest(
        v_room_before - p_quantity,
        0
      );

    v_room_delta :=
      v_room_after - v_room_before;
  else
    /*
     * Variant has never been physically counted.
     * Leave the room inventory untouched.
     */
    v_room_before := 0;
    v_room_after := 0;
    v_room_delta := 0;
  end if;

  /*
   * Lock an existing cadet inventory row,
   * if one exists.
   */
  select id, quantity
  into v_inventory_id, v_cadet_before
  from public.cadet_inventory
  where cadet_id = p_cadet_id
    and catalog_variant_id = p_catalog_variant_id
  for update;

  /*
   * Update room inventory only when a room row exists.
   *
   * last_counted_at intentionally does not change.
   * Issuing inventory is not a new physical count.
   */
  if v_room_exists then
    update public.room_inventory
    set
      quantity_on_hand = v_room_after,
      updated_at = now(),
      updated_by = v_actor
    where catalog_variant_id = p_catalog_variant_id;
  end if;

  /*
   * Add the full requested quantity to the cadet,
   * regardless of the current room count.
   */
  if v_inventory_id is null then
    v_cadet_before := 0;
    v_cadet_after := p_quantity;

    insert into public.cadet_inventory (
      cadet_id,
      catalog_variant_id,
      quantity
    )
    values (
      p_cadet_id,
      p_catalog_variant_id,
      v_cadet_after
    );
  else
    v_cadet_after :=
      v_cadet_before + p_quantity;

    update public.cadet_inventory
    set quantity = v_cadet_after
    where id = v_inventory_id;
  end if;

  /*
   * Record the room side of the transaction.
   *
   * quantity_delta represents the amount actually removed
   * from recorded room stock. It may therefore be zero even
   * though the cadet received inventory.
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
    'issue',
    v_room_before,
    v_room_after,
    v_room_delta,
    p_cadet_id,
    v_actor,
    nullif(trim(p_notes), '')
  );
end;
$$;

revoke all
on function public.issue_inventory_to_cadet(
  uuid,
  uuid,
  integer,
  text
)
from public;

grant execute
on function public.issue_inventory_to_cadet(
  uuid,
  uuid,
  integer,
  text
)
to authenticated;