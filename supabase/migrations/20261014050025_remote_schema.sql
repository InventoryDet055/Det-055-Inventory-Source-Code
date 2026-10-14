SET local check_function_bodies = off;

CREATE TABLE "public"."app_items" (
  "id"               uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "uniform_category" text                     NOT NULL,
  "display_name"     text                     NOT NULL,
  "size_system"      text                     NOT NULL,
  "cut_rule"         text                     NOT NULL DEFAULT 'none'::text,
  "active"           boolean                  NOT NULL DEFAULT true,
  "sort_order"       integer                  NOT NULL DEFAULT 0,
  "created_at"       timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"       timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "app_items_category_check" CHECK ((uniform_category = ANY (ARRAY['OCP'::text, 'Blues'::text, 'PTG'::text, 'FDU'::text]))),
  CONSTRAINT "app_items_cut_rule_check" CHECK ((cut_rule = ANY (ARRAY['none'::text, 'required'::text, 'male_only'::text, 'female_only'::text]))),
  CONSTRAINT "app_items_pkey" PRIMARY KEY (id),
  CONSTRAINT "app_items_unique_name" UNIQUE (uniform_category, display_name)
);

ALTER TABLE "public"."app_items"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."cadet_inventory" (
  "id"                 uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "cadet_id"           uuid                     NOT NULL,
  "catalog_variant_id" uuid                     NOT NULL,
  "quantity"           integer                  NOT NULL DEFAULT 1,
  "created_by"         uuid,
  "updated_by"         uuid,
  "created_at"         timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"         timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "cadet_inventory_pkey" PRIMARY KEY (id),
  CONSTRAINT "cadet_inventory_quantity_check" CHECK ((quantity >= 1)),
  CONSTRAINT "cadet_inventory_unique_variant" UNIQUE (cadet_id, catalog_variant_id)
);

ALTER TABLE "public"."cadet_inventory"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."cadets" (
  "id"                           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "profile_id"                   uuid                     NOT NULL,
  "as_class"                     smallint,
  "component"                    text,
  "status"                       text                     NOT NULL DEFAULT 'active'::text,
  "created_at"                   timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"                   timestamp with time zone NOT NULL DEFAULT now(),
  "inventory_setup_completed_at" timestamp with time zone,
  CONSTRAINT "cadets_as_class_check" CHECK (((as_class IS NULL) OR ((as_class >= 100) AND (as_class <= 999)))),
  CONSTRAINT "cadets_component_check" CHECK (((component IS NULL) OR (component = ANY (ARRAY['GMC'::text, 'POC'::text])))),
  CONSTRAINT "cadets_pkey" PRIMARY KEY (id),
  CONSTRAINT "cadets_profile_id_key" UNIQUE (profile_id),
  CONSTRAINT "cadets_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'archived'::text])))
);

ALTER TABLE "public"."cadets"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."catalog_variant_wings" (
  "catalog_variant_id"  uuid                     NOT NULL,
  "wings_item_no"       text                     NOT NULL,
  "quantity_multiplier" integer                  NOT NULL DEFAULT 1,
  "mapping_role"        text                     NOT NULL DEFAULT 'primary'::text,
  "created_at"          timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "catalog_variant_wings_pkey" PRIMARY KEY (catalog_variant_id, wings_item_no),
  CONSTRAINT "mapping_quantity_check" CHECK ((quantity_multiplier > 0)),
  CONSTRAINT "mapping_role_check" CHECK ((mapping_role = ANY (ARRAY['primary'::text, 'alternative'::text, 'composite_component'::text])))
);

ALTER TABLE "public"."catalog_variant_wings"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."catalog_variants" (
  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "app_item_id"  uuid                     NOT NULL,
  "cut"          text,
  "size_display" text                     NOT NULL,
  "size_code"    text                     NOT NULL,
  "active"       boolean                  NOT NULL DEFAULT true,
  "sort_order"   integer                  NOT NULL DEFAULT 0,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"   timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "catalog_variants_cut_check" CHECK (((cut IS NULL) OR (cut = ANY (ARRAY['Male'::text, 'Female'::text])))),
  CONSTRAINT "catalog_variants_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."catalog_variants"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."inventory_events" (
  "id"                  uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "cadet_id"            uuid                     NOT NULL,
  "inventory_record_id" uuid                     NOT NULL,
  "actor_profile_id"    uuid,
  "event_type"          text                     NOT NULL,
  "before_data"         jsonb,
  "after_data"          jsonb,
  "created_at"          timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "inventory_events_pkey" PRIMARY KEY (id),
  CONSTRAINT "inventory_events_type_check"
    CHECK ((event_type = ANY (ARRAY['item_added'::text, 'quantity_changed'::text, 'variant_changed'::text, 'item_updated'::text, 'item_removed'::text])))
);

ALTER TABLE "public"."inventory_events"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."profile_roles" (
  "profile_id"  uuid                     NOT NULL,
  "role_id"     uuid                     NOT NULL,
  "assigned_by" uuid,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "profile_roles_pkey" PRIMARY KEY (profile_id, role_id)
);

ALTER TABLE "public"."profile_roles"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."profiles" (
  "id"         uuid                     NOT NULL,
  "first_name" text,
  "last_name"  text,
  "email"      text                     NOT NULL,
  "active"     boolean                  NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "profiles_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."profiles"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."roles" (
  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "name"         text                     NOT NULL,
  "display_name" text                     NOT NULL,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "roles_name_key" UNIQUE (name),
  CONSTRAINT "roles_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."roles"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."wings_variants" (
  "wings_item_no" text                     NOT NULL,
  "item_name"     text                     NOT NULL,
  "category"      text                     NOT NULL,
  "subcategory"   text                     NOT NULL,
  "sex"           text,
  "size"          text,
  "nsn"           text,
  "uom"           text,
  "active"        boolean                  NOT NULL DEFAULT true,
  "source_label"  text,
  "source_row"    integer,
  "created_at"    timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "wings_variants_pkey" PRIMARY KEY (wings_item_no)
);

ALTER TABLE "public"."wings_variants"
  ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.complete_own_inventory_setup()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin

  update public.cadets
  set
    inventory_setup_completed_at =
      coalesce(inventory_setup_completed_at, now()),
    updated_at = now()
  where
    profile_id = auth.uid()
    and status = 'active';

  if not found then
    raise exception 'No active cadet profile exists for this account';
  end if;

end;
$function$;

CREATE OR REPLACE FUNCTION public.convert_profile_to_cadre (
  p_profile_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
declare
  v_actor_id uuid := auth.uid();
  v_cadet_id uuid;
  v_cadre_role_id uuid;
  v_cadet_role_id uuid;
begin
  if v_actor_id is null then
    raise exception 'You must be signed in.';
  end if;

  -- Only Inventory Admins can perform conversions.
  if not exists (
    select 1
    from public.profile_roles pr
    join public.roles r
      on r.id = pr.role_id
    where pr.profile_id = v_actor_id
      and r.name = 'inventory_admin'
  ) then
    raise exception 'Inventory Admin access required.';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = p_profile_id
  ) then
    raise exception 'Account could not be found.';
  end if;

  select id
  into v_cadre_role_id
  from public.roles
  where name = 'cadre';

  select id
  into v_cadet_role_id
  from public.roles
  where name = 'cadet';

  if v_cadre_role_id is null then
    raise exception 'Cadre role does not exist.';
  end if;

  if v_cadet_role_id is null then
    raise exception 'Cadet role does not exist.';
  end if;

  select id
  into v_cadet_id
  from public.cadets
  where profile_id = p_profile_id;

  if v_cadet_id is not null then

    -- Never silently destroy actual issued inventory.
    if exists (
      select 1
      from public.cadet_inventory
      where cadet_id = v_cadet_id
    ) then
      raise exception
        'This account still has inventory. Remove or resolve the inventory before converting the account to cadre.';
    end if;

    -- Never silently destroy audit history.
    if exists (
      select 1
      from public.inventory_events
      where cadet_id = v_cadet_id
    ) then
      raise exception
        'This account has inventory history. It cannot be converted automatically because the audit history must be preserved.';
    end if;

    delete from public.cadets
    where id = v_cadet_id;
  end if;

  -- Remove cadet role.
  delete from public.profile_roles
  where profile_id = p_profile_id
    and role_id = v_cadet_role_id;

  -- Ensure cadre role exists.
  insert into public.profile_roles (
    profile_id,
    role_id,
    assigned_by
  )
  values (
    p_profile_id,
    v_cadre_role_id,
    v_actor_id
  )
  on conflict (profile_id, role_id)
  do nothing;
end;
$function$;

CREATE OR REPLACE FUNCTION public.current_cadet_id()
  RETURNS uuid
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select c.id
  from public.cadets c
  where c.profile_id = auth.uid()
    and c.status = 'active'
  limit 1;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_role_id uuid;
  v_as_class smallint;
  v_component text;
begin

  /*
   * Always create the base profile.
   */
  insert into public.profiles (
    id,
    first_name,
    last_name,
    email
  )
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'first_name', ''),
    nullif(new.raw_user_meta_data ->> 'last_name', ''),
    new.email
  )
  on conflict (id)
  do update set
    email = excluded.email,
    first_name = coalesce(
      excluded.first_name,
      public.profiles.first_name
    ),
    last_name = coalesce(
      excluded.last_name,
      public.profiles.last_name
    );

  /*
   * Only automatically create a cadet record when the
   * signup explicitly identifies itself as a cadet signup.
   *
   * This prevents accounts such as the permanent shared
   * Inventory Admin from automatically becoming cadets.
   */
  if new.raw_user_meta_data ->> 'account_type' = 'cadet' then

    v_as_class :=
      nullif(
        new.raw_user_meta_data ->> 'as_class',
        ''
      )::smallint;

    /*
     * Derive GMC / POC instead of asking the user.
     */
    if v_as_class in (100, 200, 250) then
      v_component := 'GMC';

    elsif v_as_class in (300, 400) then
      v_component := 'POC';

    else
      raise exception 'Invalid AS class';
    end if;

    insert into public.cadets (
      profile_id,
      as_class,
      component,
      status
    )
    values (
      new.id,
      v_as_class,
      v_component,
      'active'
    )
    on conflict (profile_id)
    do update set
      as_class = excluded.as_class,
      component = excluded.component,
      status = 'active';

    /*
     * Assign Cadet role.
     */
    select id
    into v_role_id
    from public.roles
    where name = 'cadet';

    if v_role_id is null then
      raise exception 'Cadet role does not exist';
    end if;

    insert into public.profile_roles (
      profile_id,
      role_id
    )
    values (
      new.id,
      v_role_id
    )
    on conflict do nothing;

  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.has_role (
  required_role text
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$

  select exists (

    select 1

    from public.profile_roles pr

    join public.roles r
      on r.id = pr.role_id

    where
      pr.profile_id = auth.uid()
      and r.name = required_role

  );

$function$;

CREATE OR REPLACE FUNCTION public.log_inventory_event()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  event_name text;
begin

  if tg_op = 'INSERT' then

    insert into public.inventory_events (
      cadet_id,
      inventory_record_id,
      actor_profile_id,
      event_type,
      before_data,
      after_data
    )
    values (
      new.cadet_id,
      new.id,
      auth.uid(),
      'item_added',
      null,
      to_jsonb(new)
    );

    return new;


  elsif tg_op = 'UPDATE' then

    if old.catalog_variant_id is distinct from new.catalog_variant_id
       and old.quantity is distinct from new.quantity then

      event_name := 'item_updated';

    elsif old.catalog_variant_id is distinct from new.catalog_variant_id then

      event_name := 'variant_changed';

    elsif old.quantity is distinct from new.quantity then

      event_name := 'quantity_changed';

    else

      event_name := 'item_updated';

    end if;


    insert into public.inventory_events (
      cadet_id,
      inventory_record_id,
      actor_profile_id,
      event_type,
      before_data,
      after_data
    )
    values (
      new.cadet_id,
      new.id,
      auth.uid(),
      event_name,
      to_jsonb(old),
      to_jsonb(new)
    );

    return new;


  elsif tg_op = 'DELETE' then

    insert into public.inventory_events (
      cadet_id,
      inventory_record_id,
      actor_profile_id,
      event_type,
      before_data,
      after_data
    )
    values (
      old.cadet_id,
      old.id,
      auth.uid(),
      'item_removed',
      to_jsonb(old),
      null
    );

    return old;

  end if;

end;
$function$;

CREATE OR REPLACE FUNCTION public.set_inventory_actor()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin

  if tg_op = 'INSERT' then
    new.created_by = auth.uid();
    new.updated_by = auth.uid();

  elsif tg_op = 'UPDATE' then
    new.created_by = old.created_by;
    new.updated_by = auth.uid();
  end if;

  return new;

end;
$function$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.update_own_inventory_item (
  p_inventory_id      uuid,
  p_target_variant_id uuid,
  p_quantity          integer
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_cadet_id uuid;
  v_current_variant_id uuid;

  v_current_item_id uuid;
  v_target_item_id uuid;

  v_existing_id uuid;
  v_existing_quantity integer;
begin

  if p_quantity < 1 then
    raise exception 'Quantity must be at least 1';
  end if;


  -- Confirm that this inventory record belongs to
  -- the currently signed-in active cadet.
  select
    ci.cadet_id,
    ci.catalog_variant_id
  into
    v_cadet_id,
    v_current_variant_id
  from public.cadet_inventory ci
  join public.cadets c
    on c.id = ci.cadet_id
  where
    ci.id = p_inventory_id
    and c.profile_id = auth.uid()
    and c.status = 'active';

  if not found then
    raise exception 'Inventory record not found or access denied';
  end if;


  -- Determine the friendly item represented by
  -- the current variant.
  select app_item_id
  into v_current_item_id
  from public.catalog_variants
  where id = v_current_variant_id;


  -- Validate the requested new variant.
  select cv.app_item_id
  into v_target_item_id
  from public.catalog_variants cv
  join public.app_items ai
    on ai.id = cv.app_item_id
  where
    cv.id = p_target_variant_id
    and cv.active = true
    and ai.active = true;

  if not found then
    raise exception 'Selected size is not valid';
  end if;


  -- A cadet may change the size/cut,
  -- but cannot turn one item into a different item.
  if v_current_item_id <> v_target_item_id then
    raise exception 'Selected variant belongs to a different item';
  end if;


  -- If the variant did not change, only update quantity.
  if v_current_variant_id = p_target_variant_id then

    update public.cadet_inventory
    set quantity = p_quantity
    where id = p_inventory_id;

    return;

  end if;


  -- Check whether the cadet already has the new variant.
  select
    id,
    quantity
  into
    v_existing_id,
    v_existing_quantity
  from public.cadet_inventory
  where
    cadet_id = v_cadet_id
    and catalog_variant_id = p_target_variant_id
  limit 1;


  if found then

    -- Merge the quantities.
    update public.cadet_inventory
    set quantity = v_existing_quantity + p_quantity
    where id = v_existing_id;

    -- Remove the old variant.
    -- The inventory history trigger records this automatically.
    delete from public.cadet_inventory
    where id = p_inventory_id;

  else

    -- No conflict, so simply change the existing record.
    update public.cadet_inventory
    set
      catalog_variant_id = p_target_variant_id,
      quantity = p_quantity
    where id = p_inventory_id;

  end if;

end;
$function$;

ALTER TABLE "public"."cadet_inventory"
  ADD CONSTRAINT "cadet_inventory_cadet_id_fkey" FOREIGN KEY (cadet_id) REFERENCES public.cadets(id) ON DELETE RESTRICT;

ALTER TABLE "public"."catalog_variants"
  ADD CONSTRAINT "catalog_variants_app_item_id_fkey" FOREIGN KEY (app_item_id) REFERENCES public.app_items(id) ON DELETE CASCADE;

ALTER TABLE "public"."cadet_inventory"
  ADD CONSTRAINT "cadet_inventory_catalog_variant_id_fkey" FOREIGN KEY (catalog_variant_id) REFERENCES public.catalog_variants(id) ON DELETE RESTRICT;

ALTER TABLE "public"."catalog_variant_wings"
  ADD CONSTRAINT "catalog_variant_wings_catalog_variant_id_fkey" FOREIGN KEY (catalog_variant_id) REFERENCES public.catalog_variants(id) ON DELETE CASCADE;

ALTER TABLE "public"."inventory_events"
  ADD CONSTRAINT "inventory_events_cadet_id_fkey" FOREIGN KEY (cadet_id) REFERENCES public.cadets(id) ON DELETE RESTRICT;

ALTER TABLE "public"."profiles"
  ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."cadet_inventory"
  ADD CONSTRAINT "cadet_inventory_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE "public"."cadet_inventory"
  ADD CONSTRAINT "cadet_inventory_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE "public"."cadets"
  ADD CONSTRAINT "cadets_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."inventory_events"
  ADD CONSTRAINT "inventory_events_actor_profile_id_fkey" FOREIGN KEY (actor_profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE "public"."profile_roles"
  ADD CONSTRAINT "profile_roles_assigned_by_fkey" FOREIGN KEY (assigned_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE "public"."profile_roles"
  ADD CONSTRAINT "profile_roles_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."profile_roles"
  ADD CONSTRAINT "profile_roles_role_id_fkey" FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;

ALTER TABLE "public"."catalog_variant_wings"
  ADD CONSTRAINT "catalog_variant_wings_wings_item_no_fkey" FOREIGN KEY (wings_item_no) REFERENCES public.wings_variants(wings_item_no) ON DELETE CASCADE;

CREATE VIEW "public"."cadet_inventory_details" WITH (security_invoker=true) AS  SELECT ci.id AS inventory_id,
    c.id AS cadet_id,
    p.first_name,
    p.last_name,
    p.email,
    c.as_class,
    c.component,
    c.status,
    ai.uniform_category,
    ai.display_name AS item_name,
    cv.cut,
    cv.size_display,
    cv.size_code,
    ci.quantity,
    ci.created_by,
    ci.updated_by,
    ci.created_at,
    ci.updated_at
   FROM ((((public.cadet_inventory ci
     JOIN public.cadets c ON ((c.id = ci.cadet_id)))
     JOIN public.profiles p ON ((p.id = c.profile_id)))
     JOIN public.catalog_variants cv ON ((cv.id = ci.catalog_variant_id)))
     JOIN public.app_items ai ON ((ai.id = cv.app_item_id)));

CREATE VIEW "public"."unmapped_cadet_inventory" WITH (security_invoker=true) AS  SELECT ci.id AS inventory_id,
    c.id AS cadet_id,
    p.first_name,
    p.last_name,
    ai.uniform_category,
    ai.display_name AS item_name,
    cv.cut,
    cv.size_display,
    ci.quantity,
    ci.updated_at
   FROM ((((public.cadet_inventory ci
     JOIN public.cadets c ON ((c.id = ci.cadet_id)))
     JOIN public.profiles p ON ((p.id = c.profile_id)))
     JOIN public.catalog_variants cv ON ((cv.id = ci.catalog_variant_id)))
     JOIN public.app_items ai ON ((ai.id = cv.app_item_id)))
  WHERE (NOT (EXISTS ( SELECT 1
           FROM public.catalog_variant_wings cvw
          WHERE (cvw.catalog_variant_id = cv.id))));

CREATE VIEW "public"."wings_cadet_inventory" WITH (security_invoker=true) AS  SELECT ci.id AS inventory_id,
    c.id AS cadet_id,
    p.first_name,
    p.last_name,
    p.email,
    c.as_class,
    c.component,
    ai.uniform_category,
    ai.display_name AS app_item_name,
    cv.cut,
    cv.size_display AS app_size,
    w.wings_item_no,
    w.item_name AS wings_item_name,
    w.category AS wings_category,
    w.subcategory AS wings_subcategory,
    w.sex AS wings_sex,
    w.size AS wings_size,
    w.nsn,
    w.uom,
    cvw.mapping_role,
    ci.quantity AS app_quantity,
    (ci.quantity * cvw.quantity_multiplier) AS wings_quantity,
    ci.updated_at
   FROM ((((((public.cadet_inventory ci
     JOIN public.cadets c ON ((c.id = ci.cadet_id)))
     JOIN public.profiles p ON ((p.id = c.profile_id)))
     JOIN public.catalog_variants cv ON ((cv.id = ci.catalog_variant_id)))
     JOIN public.app_items ai ON ((ai.id = cv.app_item_id)))
     JOIN public.catalog_variant_wings cvw ON ((cvw.catalog_variant_id = cv.id)))
     JOIN public.wings_variants w ON ((w.wings_item_no = cvw.wings_item_no)));

CREATE UNIQUE INDEX catalog_variants_unique_variant ON public.catalog_variants USING btree (app_item_id, COALESCE(cut, ''::text), size_code);

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER app_items_set_updated_at
  BEFORE UPDATE ON public.app_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER cadet_inventory_log_event
  AFTER INSERT OR DELETE OR UPDATE ON public.cadet_inventory
  FOR EACH ROW
  EXECUTE FUNCTION public.log_inventory_event();

CREATE TRIGGER cadet_inventory_set_actor
  BEFORE INSERT OR UPDATE ON public.cadet_inventory
  FOR EACH ROW
  EXECUTE FUNCTION public.set_inventory_actor();

CREATE TRIGGER cadet_inventory_set_updated_at
  BEFORE UPDATE ON public.cadet_inventory
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER cadets_set_updated_at
  BEFORE UPDATE ON public.cadets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER catalog_variants_set_updated_at
  BEFORE UPDATE ON public.catalog_variants
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Authenticated users can view app items" ON "public"."app_items"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "Inventory Admin can manage app items" ON "public"."app_items"
  FOR ALL
  TO "authenticated"
  USING (public.has_role('inventory_admin'::text))
  WITH CHECK (public.has_role('inventory_admin'::text));

CREATE POLICY "Authorized staff can view all inventory" ON "public"."cadet_inventory"
  FOR SELECT
  TO "authenticated"
  USING ((public.has_role('inventory_assistant'::text) OR public.has_role('inventory_admin'::text) OR public.has_role('cadre'::text)));

CREATE POLICY "Cadets can add own inventory" ON "public"."cadet_inventory"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((cadet_id = public.current_cadet_id()) AND (EXISTS ( SELECT 1
   FROM (public.catalog_variants cv
     JOIN public.app_items ai ON ((ai.id = cv.app_item_id)))
  WHERE ((cv.id = cadet_inventory.catalog_variant_id) AND (cv.active = true) AND (ai.active = true))))));

CREATE POLICY "Cadets can update own inventory" ON "public"."cadet_inventory"
  FOR UPDATE
  TO "authenticated"
  USING ((cadet_id = public.current_cadet_id()))
  WITH CHECK (((cadet_id = public.current_cadet_id()) AND (quantity >= 1) AND (EXISTS ( SELECT 1
   FROM (public.catalog_variants cv
     JOIN public.app_items ai ON ((ai.id = cv.app_item_id)))
  WHERE ((cv.id = cadet_inventory.catalog_variant_id) AND (cv.active = true) AND (ai.active = true))))));

CREATE POLICY "Cadets can view own inventory" ON "public"."cadet_inventory"
  FOR SELECT
  TO "authenticated"
  USING ((cadet_id = public.current_cadet_id()));

CREATE POLICY "Inventory staff can add inventory" ON "public"."cadet_inventory"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((public.has_role('inventory_assistant'::text) OR public.has_role('inventory_admin'::text)));

CREATE POLICY "Inventory staff can remove inventory" ON "public"."cadet_inventory"
  FOR DELETE
  TO "authenticated"
  USING ((public.has_role('inventory_assistant'::text) OR public.has_role('inventory_admin'::text)));

CREATE POLICY "Inventory staff can update inventory" ON "public"."cadet_inventory"
  FOR UPDATE
  TO "authenticated"
  USING ((public.has_role('inventory_assistant'::text) OR public.has_role('inventory_admin'::text)))
  WITH CHECK ((public.has_role('inventory_assistant'::text) OR public.has_role('inventory_admin'::text)));

CREATE POLICY "Authorized staff can view all cadets" ON "public"."cadets"
  FOR SELECT
  TO "authenticated"
  USING ((public.has_role('inventory_assistant'::text) OR public.has_role('inventory_admin'::text) OR public.has_role('cadre'::text)));

CREATE POLICY "Cadets can view own record" ON "public"."cadets"
  FOR SELECT
  TO "authenticated"
  USING ((profile_id = auth.uid()));

CREATE POLICY "Inventory Admin can create cadets" ON "public"."cadets"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (public.has_role('inventory_admin'::text));

CREATE POLICY "Inventory Admin can delete cadets" ON "public"."cadets"
  FOR DELETE
  TO "authenticated"
  USING (public.has_role('inventory_admin'::text));

CREATE POLICY "Inventory Admin can update cadets" ON "public"."cadets"
  FOR UPDATE
  TO "authenticated"
  USING (public.has_role('inventory_admin'::text))
  WITH CHECK (public.has_role('inventory_admin'::text));

CREATE POLICY "Authorized staff can view WINGS mappings" ON "public"."catalog_variant_wings"
  FOR SELECT
  TO "authenticated"
  USING ((public.has_role('inventory_assistant'::text) OR public.has_role('inventory_admin'::text) OR public.has_role('cadre'::text)));

CREATE POLICY "Inventory Admin can manage WINGS mappings" ON "public"."catalog_variant_wings"
  FOR ALL
  TO "authenticated"
  USING (public.has_role('inventory_admin'::text))
  WITH CHECK (public.has_role('inventory_admin'::text));

CREATE POLICY "Authenticated users can view catalog variants" ON "public"."catalog_variants"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "Inventory Admin can manage catalog variants" ON "public"."catalog_variants"
  FOR ALL
  TO "authenticated"
  USING (public.has_role('inventory_admin'::text))
  WITH CHECK (public.has_role('inventory_admin'::text));

CREATE POLICY "Authorized staff can view inventory history" ON "public"."inventory_events"
  FOR SELECT
  TO "authenticated"
  USING ((public.has_role('inventory_assistant'::text) OR public.has_role('inventory_admin'::text) OR public.has_role('cadre'::text)));

CREATE POLICY "Cadets can view own inventory history" ON "public"."inventory_events"
  FOR SELECT
  TO "authenticated"
  USING ((cadet_id = public.current_cadet_id()));

CREATE POLICY "Inventory Admin can assign roles" ON "public"."profile_roles"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (public.has_role('inventory_admin'::text));

CREATE POLICY "Inventory Admin can revoke roles" ON "public"."profile_roles"
  FOR DELETE
  TO "authenticated"
  USING (public.has_role('inventory_admin'::text));

CREATE POLICY "Inventory Admin can view all role assignments" ON "public"."profile_roles"
  FOR SELECT
  TO "authenticated"
  USING (public.has_role('inventory_admin'::text));

CREATE POLICY "Users can view own roles" ON "public"."profile_roles"
  FOR SELECT
  TO "authenticated"
  USING ((profile_id = auth.uid()));

CREATE POLICY "Authorized staff can view all profiles" ON "public"."profiles"
  FOR SELECT
  TO "authenticated"
  USING ((public.has_role('inventory_assistant'::text) OR public.has_role('inventory_admin'::text) OR public.has_role('cadre'::text)));

CREATE POLICY "Inventory Admin can update profiles" ON "public"."profiles"
  FOR UPDATE
  TO "authenticated"
  USING (public.has_role('inventory_admin'::text))
  WITH CHECK (public.has_role('inventory_admin'::text));

CREATE POLICY "Users can update own profile" ON "public"."profiles"
  FOR UPDATE
  TO "authenticated"
  USING ((id = auth.uid()))
  WITH CHECK ((id = auth.uid()));

CREATE POLICY "Users can view own profile" ON "public"."profiles"
  FOR SELECT
  TO "authenticated"
  USING ((id = auth.uid()));

CREATE POLICY "Authenticated users can view roles" ON "public"."roles"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "Authorized staff can view WINGS catalog" ON "public"."wings_variants"
  FOR SELECT
  TO "authenticated"
  USING ((public.has_role('inventory_assistant'::text) OR public.has_role('inventory_admin'::text) OR public.has_role('cadre'::text)));

CREATE POLICY "Inventory Admin can manage WINGS catalog" ON "public"."wings_variants"
  FOR ALL
  TO "authenticated"
  USING (public.has_role('inventory_admin'::text))
  WITH CHECK (public.has_role('inventory_admin'::text));

REVOKE ALL ON FUNCTION "public"."complete_own_inventory_setup"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."complete_own_inventory_setup"() TO "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."complete_own_inventory_setup"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."complete_own_inventory_setup"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."complete_own_inventory_setup"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."convert_profile_to_cadre"(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."convert_profile_to_cadre"(uuid) TO "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."convert_profile_to_cadre"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."convert_profile_to_cadre"(uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."convert_profile_to_cadre"(uuid) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."current_cadet_id"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."current_cadet_id"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."current_cadet_id"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."current_cadet_id"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."handle_new_user"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."handle_new_user"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."handle_new_user"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."has_role"(text) TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."has_role"(text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."has_role"(text) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."has_role"(text) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."log_inventory_event"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."log_inventory_event"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."log_inventory_event"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."log_inventory_event"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."set_inventory_actor"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."set_inventory_actor"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."set_inventory_actor"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."set_inventory_actor"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."set_updated_at"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."set_updated_at"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."set_updated_at"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."set_updated_at"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."update_own_inventory_item"(uuid, uuid, integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."update_own_inventory_item"(uuid, uuid, integer) TO "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."update_own_inventory_item"(uuid, uuid, integer) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."update_own_inventory_item"(uuid, uuid, integer) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."update_own_inventory_item"(uuid, uuid, integer) TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."app_items" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."app_items" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."app_items" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."app_items" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."cadet_inventory" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."cadet_inventory" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."cadet_inventory" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."cadet_inventory" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."cadets" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."cadets" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."cadets" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."cadets" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."catalog_variant_wings" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."catalog_variant_wings" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."catalog_variant_wings" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."catalog_variant_wings" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."catalog_variants" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."catalog_variants" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."catalog_variants" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."catalog_variants" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."inventory_events" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."inventory_events" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."inventory_events" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."inventory_events" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."profile_roles" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."profile_roles" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."profile_roles" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."profile_roles" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."profiles" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."profiles" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."profiles" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."profiles" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."roles" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."roles" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."roles" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."roles" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."wings_variants" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."wings_variants" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."wings_variants" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."wings_variants" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."cadet_inventory_details" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."cadet_inventory_details" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."cadet_inventory_details" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."cadet_inventory_details" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."unmapped_cadet_inventory" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."unmapped_cadet_inventory" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."unmapped_cadet_inventory" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."unmapped_cadet_inventory" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."wings_cadet_inventory" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."wings_cadet_inventory" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."wings_cadet_inventory" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."wings_cadet_inventory" TO "service_role";

