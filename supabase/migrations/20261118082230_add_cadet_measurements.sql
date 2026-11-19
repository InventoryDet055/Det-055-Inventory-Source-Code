/*
 * Global Cadet Sizing / Measurement Tracker
 *
 * One measurement profile per cadet.
 *
 * Cadets:
 * - can view/edit their own measurements
 *
 * Inventory Admin / Inventory Assistant:
 * - can view/edit all cadet measurements
 *
 * Cadre:
 * - can view all measurements
 * - cannot edit
 */

create table public.cadet_measurements (
  cadet_id uuid primary key
    references public.cadets(id)
    on delete cascade,

  /*
   * Apparel cut preference.
   * This is intentionally not stored as gender/sex.
   */
  uniform_cut_preference text,

  /*
   * Body measurements, stored in inches.
   */
  height_inches numeric(5,2),
  head_circumference_inches numeric(5,2),
  neck_inches numeric(5,2),
  chest_bust_inches numeric(5,2),
  sleeve_inches numeric(5,2),
  waist_inches numeric(5,2),
  hips_inches numeric(5,2),
  inseam_inches numeric(5,2),

  /*
   * Self-reported U.S. shoe size.
   * Width remains text because different
   * uniform footwear uses different width codes.
   */
  shoe_size numeric(4,1),
  shoe_width text,

  measured_at date,
  notes text,

  updated_by uuid
    references public.profiles(id)
    on delete set null,

  created_at timestamp with time zone
    not null default now(),

  updated_at timestamp with time zone
    not null default now(),

  constraint cadet_measurements_cut_check
    check (
      uniform_cut_preference is null
      or uniform_cut_preference in (
        'Male',
        'Female'
      )
    ),

  constraint cadet_measurements_height_check
    check (
      height_inches is null
      or (
        height_inches >= 36
        and height_inches <= 96
      )
    ),

  constraint cadet_measurements_head_check
    check (
      head_circumference_inches is null
      or (
        head_circumference_inches >= 15
        and head_circumference_inches <= 30
      )
    ),

  constraint cadet_measurements_neck_check
    check (
      neck_inches is null
      or (
        neck_inches >= 8
        and neck_inches <= 30
      )
    ),

  constraint cadet_measurements_chest_check
    check (
      chest_bust_inches is null
      or (
        chest_bust_inches >= 20
        and chest_bust_inches <= 80
      )
    ),

  constraint cadet_measurements_sleeve_check
    check (
      sleeve_inches is null
      or (
        sleeve_inches >= 15
        and sleeve_inches <= 50
      )
    ),

  constraint cadet_measurements_waist_check
    check (
      waist_inches is null
      or (
        waist_inches >= 15
        and waist_inches <= 80
      )
    ),

  constraint cadet_measurements_hips_check
    check (
      hips_inches is null
      or (
        hips_inches >= 20
        and hips_inches <= 90
      )
    ),

  constraint cadet_measurements_inseam_check
    check (
      inseam_inches is null
      or (
        inseam_inches >= 15
        and inseam_inches <= 50
      )
    ),

  constraint cadet_measurements_shoe_size_check
    check (
      shoe_size is null
      or (
        shoe_size >= 1
        and shoe_size <= 20
      )
    )
);


/* =========================================================
   Updated-at trigger
   ========================================================= */

create trigger cadet_measurements_set_updated_at
before update
on public.cadet_measurements
for each row
execute function public.set_updated_at();


/* =========================================================
   Row Level Security
   ========================================================= */

alter table public.cadet_measurements
enable row level security;


/*
 * Cadets can view their own measurements.
 */

create policy "Cadets can view own measurements"
on public.cadet_measurements
for select
to authenticated
using (
  exists (
    select 1
    from public.cadets c
    where c.id =
      cadet_measurements.cadet_id
      and c.profile_id = auth.uid()
  )
);


/*
 * Inventory staff and cadre can view
 * measurements for every cadet.
 */

create policy "Authorized staff can view all measurements"
on public.cadet_measurements
for select
to authenticated
using (
  public.has_role('inventory_admin')
  or public.has_role('inventory_assistant')
  or public.has_role('cadre')
);


/*
 * Cadets can create their own measurement record.
 */

create policy "Cadets can create own measurements"
on public.cadet_measurements
for insert
to authenticated
with check (
  exists (
    select 1
    from public.cadets c
    where c.id =
      cadet_measurements.cadet_id
      and c.profile_id = auth.uid()
  )
);


/*
 * Cadets can update only their own record.
 */

create policy "Cadets can update own measurements"
on public.cadet_measurements
for update
to authenticated
using (
  exists (
    select 1
    from public.cadets c
    where c.id =
      cadet_measurements.cadet_id
      and c.profile_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.cadets c
    where c.id =
      cadet_measurements.cadet_id
      and c.profile_id = auth.uid()
  )
);


/*
 * Inventory Admin and Inventory Assistant
 * can create measurement profiles for cadets.
 */

create policy "Inventory staff can create measurements"
on public.cadet_measurements
for insert
to authenticated
with check (
  public.has_role('inventory_admin')
  or public.has_role('inventory_assistant')
);


/*
 * Inventory Admin and Inventory Assistant
 * can update every cadet's measurements.
 */

create policy "Inventory staff can update measurements"
on public.cadet_measurements
for update
to authenticated
using (
  public.has_role('inventory_admin')
  or public.has_role('inventory_assistant')
)
with check (
  public.has_role('inventory_admin')
  or public.has_role('inventory_assistant')
);


/*
 * Only Inventory Admin can delete a measurement record.
 */

create policy "Inventory Admin can delete measurements"
on public.cadet_measurements
for delete
to authenticated
using (
  public.has_role('inventory_admin')
);


/* =========================================================
   Permissions
   ========================================================= */

grant select, insert, update, delete
on public.cadet_measurements
to authenticated;

grant all
on public.cadet_measurements
to service_role;