"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function addCadetInventoryItem(
  formData: FormData
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const cadetId = String(
    formData.get("cadet_id") ?? ""
  );

  const variantId = String(
    formData.get("catalog_variant_id") ?? ""
  );

  const quantity = Number(
    formData.get("quantity")
  );

  if (!cadetId || !variantId) {
    throw new Error(
      "Cadet or inventory item was not provided."
    );
  }

  if (
    !Number.isInteger(quantity) ||
    quantity < 1
  ) {
    throw new Error(
      "Quantity must be at least 1."
    );
  }

  /*
   * Verify that the signed-in user is
   * Inventory Admin or Inventory Assistant.
   */
  const {
    data: profileRoles,
    error: profileRolesError,
  } = await supabase
    .from("profile_roles")
    .select("role_id")
    .eq("profile_id", user.id);

  if (profileRolesError) {
    throw new Error(
      profileRolesError.message
    );
  }

  const roleIds =
    profileRoles?.map(
      (role) => role.role_id
    ) ?? [];

  let roleNames: string[] = [];

  if (roleIds.length > 0) {
    const {
      data: roles,
      error: rolesError,
    } = await supabase
      .from("roles")
      .select("name")
      .in("id", roleIds);

    if (rolesError) {
      throw new Error(
        rolesError.message
      );
    }

    roleNames =
      roles?.map(
        (role) => role.name
      ) ?? [];
  }

  const canEdit =
    roleNames.includes(
      "inventory_admin"
    ) ||
    roleNames.includes(
      "inventory_assistant"
    );

  if (!canEdit) {
    throw new Error(
      "You do not have permission to modify inventory."
    );
  }

  /*
   * Confirm the target cadet exists.
   */
  const {
    data: cadet,
    error: cadetError,
  } = await supabase
    .from("cadets")
    .select("id")
    .eq("id", cadetId)
    .single();

  if (cadetError || !cadet) {
    throw new Error(
      "Cadet could not be found."
    );
  }

  /*
   * Validate the selected catalog variant.
   */
  const {
    data: variant,
    error: variantError,
  } = await supabase
    .from("catalog_variants")
    .select(`
      id,
      app_item_id,
      active
    `)
    .eq("id", variantId)
    .eq("active", true)
    .single();

  if (variantError || !variant) {
    throw new Error(
      "Selected inventory variant is invalid."
    );
  }

  /*
   * Make sure the friendly app item
   * itself is also active.
   */
  const {
    data: appItem,
    error: appItemError,
  } = await supabase
    .from("app_items")
    .select("id")
    .eq("id", variant.app_item_id)
    .eq("active", true)
    .single();

  if (appItemError || !appItem) {
    throw new Error(
      "Selected inventory item is inactive."
    );
  }

  /*
   * Check whether the cadet already owns
   * this exact item / cut / size variant.
   */
  const {
    data: existing,
    error: existingError,
  } = await supabase
    .from("cadet_inventory")
    .select("id, quantity")
    .eq("cadet_id", cadetId)
    .eq(
      "catalog_variant_id",
      variantId
    )
    .maybeSingle();

  if (existingError) {
    throw new Error(
      existingError.message
    );
  }

  if (existing) {
    /*
     * Same exact variant already exists:
     * increase quantity instead of creating
     * a duplicate row.
     */
    const { error } =
      await supabase
        .from("cadet_inventory")
        .update({
          quantity:
            Number(
              existing.quantity
            ) + quantity,
        })
        .eq("id", existing.id);

    if (error) {
      throw new Error(
        error.message
      );
    }
  } else {
    /*
     * New variant for this cadet.
     */
    const { error } =
      await supabase
        .from("cadet_inventory")
        .insert({
          cadet_id: cadetId,
          catalog_variant_id:
            variantId,
          quantity,
        });

    if (error) {
      throw new Error(
        error.message
      );
    }
  }

  redirect(
    `/cadets/${cadetId}`
  );
}