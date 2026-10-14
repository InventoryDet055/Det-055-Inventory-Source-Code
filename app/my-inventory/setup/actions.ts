"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type SubmittedInventoryItem = {
  catalog_variant_id: string;
  quantity: number;
};

type InventoryMode =
  | "setup"
  | "add";

export async function completeInventorySetup(
  formData: FormData
) {
  const supabase =
    await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  /*
   * Determine whether this is the
   * initial setup or later bulk-add
   * workflow.
   */
  const requestedMode =
    String(
      formData.get("mode") ??
        "setup"
    );

  const mode: InventoryMode =
    requestedMode === "add"
      ? "add"
      : "setup";

  const rawInventory =
    String(
      formData.get(
        "inventory_json"
      ) ?? ""
    );

  if (!rawInventory) {
    throw new Error(
      "No inventory data was submitted."
    );
  }

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

  if (!Array.isArray(submitted)) {
    throw new Error(
      "Inventory submission was invalid."
    );
  }

  const {
    data: cadet,
    error: cadetError,
  } = await supabase
    .from("cadets")
    .select(
      "id, inventory_setup_completed_at"
    )
    .eq("profile_id", user.id)
    .eq("status", "active")
    .single();

  if (
    cadetError ||
    !cadet
  ) {
    throw new Error(
      "No active cadet profile exists."
    );
  }

  /*
   * Prevent the initial setup action
   * from being rerun after setup has
   * already been completed.
   */
  if (
    mode === "setup" &&
    cadet.inventory_setup_completed_at
  ) {
    redirect("/my-inventory");
  }

  /*
   * If setup has not yet been completed,
   * users should use the normal setup
   * workflow rather than Add Items.
   */
  if (
    mode === "add" &&
    !cadet.inventory_setup_completed_at
  ) {
    redirect(
      "/my-inventory/setup"
    );
  }

  /*
   * Merge duplicates within this
   * submission.
   *
   * Example:
   *
   * M-R Qty 1
   * M-R Qty 2
   *
   * becomes:
   *
   * M-R Qty 3
   */
  const merged =
    new Map<
      string,
      number
    >();

  for (
    const item of submitted
  ) {
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

  if (variantIds.length > 0) {
    /*
     * Validate that every submitted
     * variant is still active and its
     * parent item is active.
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
      .in(
        "id",
        variantIds
      )
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
      (
        validVariants?.length ??
        0
      ) !== variantIds.length
    ) {
      throw new Error(
        "One or more selected inventory variants are no longer valid."
      );
    }

    /*
     * INITIAL SETUP
     *
     * Submitted quantities represent
     * what the cadet currently has.
     *
     * Example:
     *
     * Existing database: M-R Qty 1
     * Setup says:         M-R Qty 2
     *
     * Result:             M-R Qty 2
     */
    if (mode === "setup") {
      const rows =
        variantIds.map(
          (variantId) => ({
            cadet_id:
              cadet.id,

            catalog_variant_id:
              variantId,

            quantity:
              merged.get(
                variantId
              )!,
          })
        );

      const {
        error: upsertError,
      } = await supabase
        .from(
          "cadet_inventory"
        )
        .upsert(rows, {
          onConflict:
            "cadet_id,catalog_variant_id",
        });

      if (upsertError) {
        throw new Error(
          upsertError.message
        );
      }
    }

    /*
     * ADD ITEMS MODE
     *
     * Submitted quantities are added
     * to whatever the cadet already
     * has.
     *
     * Example:
     *
     * Existing: M-R Qty 1
     * Add Items: M-R Qty 2
     *
     * Result:   M-R Qty 3
     */
    if (mode === "add") {
      const {
        data: existingRows,
        error:
          existingError,
      } = await supabase
        .from(
          "cadet_inventory"
        )
        .select(`
          catalog_variant_id,
          quantity
        `)
        .eq(
          "cadet_id",
          cadet.id
        )
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
        new Map<
          string,
          number
        >(
          (
            existingRows ?? []
          ).map(
            (row) => [
              row.catalog_variant_id,
              row.quantity,
            ]
          )
        );

      const rows =
        variantIds.map(
          (variantId) => ({
            cadet_id:
              cadet.id,

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
        .from(
          "cadet_inventory"
        )
        .upsert(rows, {
          onConflict:
            "cadet_id,catalog_variant_id",
        });

      if (upsertError) {
        throw new Error(
          upsertError.message
        );
      }
    }
  }

  /*
   * Only initial setup marks the
   * cadet's setup as complete.
   */
  if (mode === "setup") {
    const {
      error: completionError,
    } = await supabase.rpc(
      "complete_own_inventory_setup"
    );

    if (completionError) {
      throw new Error(
        completionError.message
      );
    }
  }

  redirect("/my-inventory");
}