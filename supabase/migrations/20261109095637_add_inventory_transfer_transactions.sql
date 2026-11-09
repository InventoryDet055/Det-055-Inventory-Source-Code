/*
 * Atomic Inventory Room <-> Cadet transactions.
 *
 * ISSUE:
 *   room inventory decreases
 *   cadet inventory increases
 *
 * RETURN:
 *   cadet inventory decreases
 *   room inventory increases
 *
 * Both operations run inside a single PostgreSQL
 * transaction because each RPC call is atomic.
 */


/*
 * ISSUE INVENTORY TO CADET
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
  v_room_before integer;
  v_room_after integer;

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
   * Lock the room inventory row so two staff
   * members cannot issue the same final item
   * simultaneously.
   */
  select quantity_on_hand
  into v_room_before
  from public.room_inventory
  where catalog_variant_id = p_catalog_variant_id
  for update;

  if not found then
    raise exception
      'This variant has not been physically counted into the Inventory Room yet.';
  end if;

  if v_room_before < p_quantity then
    raise exception
      'Not enough Inventory Room stock. Available: %, requested: %.',
      v_room_before,
      p_quantity;
  end if;

  v_room_after :=
    v_room_before - p_quantity;

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
   * Move quantity out of the room.
   *
   * last_counted_at intentionally does NOT
   * change. An issue is a transaction, not a
   * new physical count.
   */
  update public.room_inventory
  set
    quantity_on_hand = v_room_after,
    updated_at = now(),
    updated_by = v_actor
  where catalog_variant_id = p_catalog_variant_id;

  /*
   * Move quantity onto the cadet.
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
    -p_quantity,
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


/*
 * RETURN INVENTORY FROM CADET
 *
 * We are creating the backend transaction now.
 * The user-facing Return button will be wired
 * into the cadet page after Issue is verified.
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
   * Lock the cadet's inventory row.
   */
  select id, quantity
  into v_inventory_id, v_cadet_before
  from public.cadet_inventory
  where cadet_id = p_cadet_id
    and catalog_variant_id = p_catalog_variant_id
  for update;

  if not found then
    raise exception 'Cadet does not have this inventory variant.';
  end if;

  if v_cadet_before < p_quantity then
    raise exception
      'Cadet only has % of this variant. Cannot return %.',
      v_cadet_before,
      p_quantity;
  end if;

  /*
   * A physical room baseline must exist before
   * we add returned inventory to it.
   */
  select quantity_on_hand
  into v_room_before
  from public.room_inventory
  where catalog_variant_id = p_catalog_variant_id
  for update;

  if not found then
    raise exception
      'This variant must be physically counted in the Inventory Room before processing a return.';
  end if;

  v_cadet_after :=
    v_cadet_before - p_quantity;

  v_room_after :=
    v_room_before + p_quantity;

  /*
   * Remove or reduce the cadet holding.
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
   * Add the returned item to room stock.
   */
  update public.room_inventory
  set
    quantity_on_hand = v_room_after,
    updated_at = now(),
    updated_by = v_actor
  where catalog_variant_id = p_catalog_variant_id;

  /*
   * Record room-side movement.
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