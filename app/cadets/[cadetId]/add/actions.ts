"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type SubmittedInventoryItem = {
  catalog_variant_id: string;
  quantity: number;
};

export async function addCadetInventoryItems(
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

  const rawInventory = String(
    formData.get("inventory_json") ?? ""
  );

  if (!cadetId) {
    throw new Error(
      "Cadet was not provided."
    );
  }

  if (!rawInventory) {
    throw new Error(
      "No inventory data was submitted."
    );
  }

  /*
   * Verify Admin / Assistant permissions.
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
   * Confirm target cadet exists.
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
   * Parse submitted inventory.
   */
  let submitted:
    SubmittedInventoryItem[];

  try {
    submitted =
      JSON.parse(rawInventory);
  } catch {
    throw new Error(
      "Inventory submission was invalid."
    );
  }

  if (
    !Array.isArray(submitted) ||
    submitted.length === 0
  ) {
    throw new Error(
      "Select at least one inventory item."
    );
  }

  /*
   * Combine duplicate variants within
   * the same submission.
   */
  const merged =
    new Map<string, number>();

  for (const item of submitted) {
    if (
      !item.catalog_variant_id ||
      !Number.isInteger(
        item.quantity
      ) ||
      item.quantity < 1
    ) {
      throw new Error(
        "One or more inventory entries are invalid."
      );
    }

    merged.set(
      item.catalog_variant_id,
      (
        merged.get(
          item.catalog_variant_id
        ) ?? 0
      ) + item.quantity
    );
  }

  const variantIds = [
    ...merged.keys(),
  ];

  /*
   * Validate variants.
   */
  const {
    data: validVariants,
    error: variantError,
  } = await supabase
    .from("catalog_variants")
    .select(`
      id,
      app_items!inner (
        active
      )
    `)
    .in("id", variantIds)
    .eq("active", true)
    .eq(
      "app_items.active",
      true
    );

  if (variantError) {
    throw new Error(
      variantError.message
    );
  }

  if (
    (validVariants?.length ?? 0) !==
    variantIds.length
  ) {
    throw new Error(
      "One or more selected inventory variants are no longer valid."
    );
  }

  /*
   * Find quantities the cadet already has.
   */
  const {
    data: existingRows,
    error: existingError,
  } = await supabase
    .from("cadet_inventory")
    .select(`
      catalog_variant_id,
      quantity
    `)
    .eq("cadet_id", cadetId)
    .in(
      "catalog_variant_id",
      variantIds
    );

  if (existingError) {
    throw new Error(
      existingError.message
    );
  }

  const existingMap =
    new Map<string, number>(
      (existingRows ?? []).map(
        (row) => [
          row.catalog_variant_id,
          Number(row.quantity),
        ]
      )
    );

  /*
   * Staff Add Items always ADDS to the
   * cadet's existing quantity.
   */
  const rows =
    variantIds.map(
      (variantId) => ({
        cadet_id: cadetId,

        catalog_variant_id:
          variantId,

        quantity:
          (
            existingMap.get(
              variantId
            ) ?? 0
          ) +
          merged.get(
            variantId
          )!,
      })
    );

  const {
    error: upsertError,
  } = await supabase
    .from("cadet_inventory")
    .upsert(rows, {
      onConflict:
        "cadet_id,catalog_variant_id",
    });

  if (upsertError) {
    throw new Error(
      upsertError.message
    );
  }

  redirect(
    `/cadets/${cadetId}`
  );
}