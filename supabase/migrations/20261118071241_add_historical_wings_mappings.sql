/*
 * Add three WINGS item records confirmed by historical
 * Det 055 inventory data and map them to existing catalog variants.
 *
 * Historical source:
 * - 0000000844 -> Male Necktie
 * - 0000004201 -> Male OCP Boots 12W
 * - 0000004684 -> Female OCP Boots 9W
 *
 * Existing mappings are not changed.
 */


/* =========================================================
   1. Add missing WINGS reference records
   ========================================================= */

insert into public.wings_variants (
  wings_item_no,
  item_name,
  category,
  subcategory,
  sex,
  size,
  nsn,
  uom,
  active,
  source_label,
  source_row,
  created_at
)
select
  d.wings_item_no,
  d.item_name,
  d.category,
  d.subcategory,
  d.sex,
  d.size,
  d.nsn,
  d.uom,
  true,
  'Det 055 historical inventory',
  d.source_row,
  now()
from (
  values
    (
      '0000000844',
      'NECKTIE,MENS',
      'Accessories',
      'Neck Tie/Tab',
      'M',
      'NECKTIE',
      '8440013815531',
      'EA',
      159
    ),
    (
      '0000004201',
      'COYOTE BROWN BOOTS',
      'Footwear',
      'OCP',
      'M',
      '12W',
      '8430016759430',
      'PR',
      248
    ),
    (
      '0000004684',
      'COYOTE BROWN BOOTS',
      'Footwear',
      'OCP',
      'F',
      '9W',
      '8435016758159',
      'PR',
      292
    )
) as d(
  wings_item_no,
  item_name,
  category,
  subcategory,
  sex,
  size,
  nsn,
  uom,
  source_row
)
where not exists (
  select 1
  from public.wings_variants wv
  where wv.wings_item_no = d.wings_item_no
);


/* =========================================================
   2. Map the WINGS records to catalog variants
   ========================================================= */

with desired_mappings (
  uniform_category,
  item_name,
  cut,
  size_code,
  wings_item_no
) as (
  values
    (
      'Blues',
      'Necktie',
      'Male',
      'ONE-SIZE',
      '0000000844'
    ),
    (
      'OCP',
      'OCP Boots',
      'Male',
      '12W',
      '0000004201'
    ),
    (
      'OCP',
      'OCP Boots',
      'Female',
      '9W',
      '0000004684'
    )
)
insert into public.catalog_variant_wings (
  catalog_variant_id,
  wings_item_no,
  quantity_multiplier,
  mapping_role,
  created_at
)
select
  cv.id,
  dm.wings_item_no,
  1,
  'primary',
  now()
from desired_mappings dm
join public.app_items ai
  on ai.uniform_category = dm.uniform_category
 and ai.display_name = dm.item_name
join public.catalog_variants cv
  on cv.app_item_id = ai.id
 and cv.cut = dm.cut
 and cv.size_code = dm.size_code
join public.wings_variants wv
  on wv.wings_item_no = dm.wings_item_no
where not exists (
  select 1
  from public.catalog_variant_wings cvw
  where cvw.catalog_variant_id = cv.id
    and cvw.wings_item_no = dm.wings_item_no
);