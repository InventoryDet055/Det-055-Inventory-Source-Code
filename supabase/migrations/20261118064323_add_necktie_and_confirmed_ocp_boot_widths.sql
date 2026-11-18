/*
 * Conservative catalog expansion.
 *
 * Adds:
 * - Blues Necktie, Male, One Size
 * - OCP Boots, Female 9W
 * - OCP Boots, Male 12W
 *
 * Existing catalog rows are not modified or deleted.
 */


/* =========================================================
   1. Add male Blues Necktie
   ========================================================= */

insert into public.app_items (
  id,
  uniform_category,
  display_name,
  size_system,
  cut_rule,
  active,
  sort_order,
  created_at,
  updated_at
)
select
  '0f7f3a8c-d793-4da6-9a93-bf2bd38792fc'::uuid,
  'Blues',
  'Necktie',
  'none',
  'male_only',
  true,
  85,
  now(),
  now()
where not exists (
  select 1
  from public.app_items
  where uniform_category = 'Blues'
    and display_name = 'Necktie'
);


insert into public.catalog_variants (
  id,
  app_item_id,
  cut,
  size_display,
  size_code,
  active,
  sort_order,
  created_at,
  updated_at
)
select
  '6eb96a6c-5de0-468c-92da-ec58ea76686c'::uuid,
  ai.id,
  'Male',
  'One Size',
  'ONE-SIZE',
  true,
  1,
  now(),
  now()
from public.app_items ai
where ai.uniform_category = 'Blues'
  and ai.display_name = 'Necktie'
  and not exists (
    select 1
    from public.catalog_variants cv
    where cv.app_item_id = ai.id
      and cv.cut = 'Male'
      and cv.size_code = 'ONE-SIZE'
  );


/* =========================================================
   2. Add historically confirmed OCP boot widths
   ========================================================= */

/*
 * During a local db reset, app_items from seed.sql do not
 * exist yet when migrations run.
 *
 * Therefore these inserts are conditional on OCP Boots
 * already existing.
 *
 * Production already contains OCP Boots, so the migration
 * will add the variants there.
 *
 * Local development receives the same two variants through
 * seed.sql after migrations finish.
 */


/* Female 9W */

insert into public.catalog_variants (
  id,
  app_item_id,
  cut,
  size_display,
  size_code,
  active,
  sort_order,
  created_at,
  updated_at
)
select
  '90743962-aa65-4b1c-b614-a0206050561a'::uuid,
  ai.id,
  'Female',
  '9W',
  '9W',
  true,
  coalesce(
    (
      select cv.sort_order
      from public.catalog_variants cv
      where cv.app_item_id = ai.id
        and cv.cut = 'Female'
        and cv.size_code = '9R'
      limit 1
    ),
    1000
  ),
  now(),
  now()
from public.app_items ai
where ai.uniform_category = 'OCP'
  and ai.display_name = 'OCP Boots'
  and not exists (
    select 1
    from public.catalog_variants cv
    where cv.app_item_id = ai.id
      and cv.cut = 'Female'
      and cv.size_code = '9W'
  );


/* Male 12W */

insert into public.catalog_variants (
  id,
  app_item_id,
  cut,
  size_display,
  size_code,
  active,
  sort_order,
  created_at,
  updated_at
)
select
  '08767bd4-1744-49ef-a715-4b4108812605'::uuid,
  ai.id,
  'Male',
  '12W',
  '12W',
  true,
  coalesce(
    (
      select cv.sort_order
      from public.catalog_variants cv
      where cv.app_item_id = ai.id
        and cv.cut = 'Male'
        and cv.size_code = '12R'
      limit 1
    ),
    1000
  ),
  now(),
  now()
from public.app_items ai
where ai.uniform_category = 'OCP'
  and ai.display_name = 'OCP Boots'
  and not exists (
    select 1
    from public.catalog_variants cv
    where cv.app_item_id = ai.id
      and cv.cut = 'Male'
      and cv.size_code = '12W'
  );