"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function editCadetInventoryItem(
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

  const inventoryId = String(
    formData.get("inventory_id") ?? ""
  );

  const targetVariantId = String(
    formData.get("catalog_variant_id") ?? ""
  );

  const quantity = Number(
    formData.get("quantity")
  );

  if (
    !cadetId ||
    !inventoryId ||
    !targetVariantId
  ) {
    throw new Error(
      "Required inventory information is missing."
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
   * Verify Inventory Admin / Assistant.
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
   * Load existing inventory record.
   */
  const {
    data: currentInventory,
    error: inventoryError,
  } = await supabase
    .from("cadet_inventory")
    .select(`
      id,
      cadet_id,
      catalog_variant_id,
      quantity
    `)
    .eq("id", inventoryId)
    .eq("cadet_id", cadetId)
    .single();

  if (
    inventoryError ||
    !currentInventory
  ) {
    throw new Error(
      "Inventory record could not be found."
    );
  }

  /*
   * Determine the friendly item represented
   * by the current variant.
   */
  const {
    data: currentVariant,
    error: currentVariantError,
  } = await supabase
    .from("catalog_variants")
    .select(`
      id,
      app_item_id
    `)
    .eq(
      "id",
      currentInventory.catalog_variant_id
    )
    .single();

  if (
    currentVariantError ||
    !currentVariant
  ) {
    throw new Error(
      "Current inventory variant could not be found."
    );
  }

  /*
   * Validate target variant.
   */
  const {
    data: targetVariant,
    error: targetVariantError,
  } = await supabase
    .from("catalog_variants")
    .select(`
      id,
      app_item_id,
      active
    `)
    .eq("id", targetVariantId)
    .eq("active", true)
    .single();

  if (
    targetVariantError ||
    !targetVariant
  ) {
    throw new Error(
      "Selected inventory variant is invalid."
    );
  }

  /*
   * Staff can change cut/size, but an edit
   * cannot turn one item into a different item.
   */
  if (
    currentVariant.app_item_id !==
    targetVariant.app_item_id
  ) {
    throw new Error(
      "Selected size belongs to a different inventory item."
    );
  }

  /*
   * Variant unchanged: update exact quantity.
   */
  if (
    currentInventory.catalog_variant_id ===
    targetVariantId
  ) {
    const { error } = await supabase
      .from("cadet_inventory")
      .update({
        quantity,
      })
      .eq("id", inventoryId)
      .eq("cadet_id", cadetId);

    if (error) {
      throw new Error(error.message);
    }

    redirect(`/cadets/${cadetId}`);
  }

  /*
   * Check whether target variant already exists
   * for this cadet.
   */
  const {
    data: existingTarget,
    error: existingTargetError,
  } = await supabase
    .from("cadet_inventory")
    .select(`
      id,
      quantity
    `)
    .eq("cadet_id", cadetId)
    .eq(
      "catalog_variant_id",
      targetVariantId
    )
    .maybeSingle();

  if (existingTargetError) {
    throw new Error(
      existingTargetError.message
    );
  }

  if (existingTarget) {
    /*
     * Merge if the requested target variant
     * already exists.
     *
     * Example:
     * M-R Qty 1
     * M-L Qty 2
     *
     * Edit M-L -> M-R Qty 2
     *
     * Result:
     * M-R Qty 3
     */

    const newQuantity =
      Number(
        existingTarget.quantity
      ) + quantity;

    const { error: updateError } =
      await supabase
        .from("cadet_inventory")
        .update({
          quantity: newQuantity,
        })
        .eq(
          "id",
          existingTarget.id
        );

    if (updateError) {
      throw new Error(
        updateError.message
      );
    }

    const { error: deleteError } =
      await supabase
        .from("cadet_inventory")
        .delete()
        .eq("id", inventoryId)
        .eq("cadet_id", cadetId);

    if (deleteError) {
      throw new Error(
        deleteError.message
      );
    }
  } else {
    /*
     * No collision: update this record directly.
     */
    const { error } = await supabase
      .from("cadet_inventory")
      .update({
        catalog_variant_id:
          targetVariantId,
        quantity,
      })
      .eq("id", inventoryId)
      .eq("cadet_id", cadetId);

    if (error) {
      throw new Error(error.message);
    }
  }

  redirect(`/cadets/${cadetId}`);
}