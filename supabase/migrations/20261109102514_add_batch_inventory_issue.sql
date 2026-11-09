/*
 * Atomically issue multiple Inventory Room variants
 * to one cadet in a single database transaction.
 *
 * If any individual item fails, PostgreSQL rolls
 * back the entire batch.
 */

create or replace function public.issue_inventory_batch_to_cadet(
  p_cadet_id uuid,
  p_items jsonb,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;
  v_item jsonb;
  v_variant_id uuid;
  v_quantity integer;
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

  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'No inventory items were provided.';
  end if;

  for v_item in
    select value
    from jsonb_array_elements(p_items)
  loop
    if not (v_item ? 'catalog_variant_id')
       or not (v_item ? 'quantity') then
      raise exception 'One or more inventory entries are invalid.';
    end if;

    begin
      v_variant_id :=
        (v_item ->> 'catalog_variant_id')::uuid;

      v_quantity :=
        (v_item ->> 'quantity')::integer;
    exception
      when others then
        raise exception 'One or more inventory entries are invalid.';
    end;

    if v_quantity < 1 then
      raise exception 'Quantity must be at least 1.';
    end if;

    /*
     * Reuse the already-tested single-item transaction.
     *
     * Because this function itself is one database call,
     * failure anywhere in this loop rolls back every
     * preceding issue in this batch.
     */
    perform public.issue_inventory_to_cadet(
      p_cadet_id,
      v_variant_id,
      v_quantity,
      p_notes
    );
  end loop;
end;
$$;

revoke all
on function public.issue_inventory_batch_to_cadet(
  uuid,
  jsonb,
  text
)
from public;

grant execute
on function public.issue_inventory_batch_to_cadet(
  uuid,
  jsonb,
  text
)
to authenticated;