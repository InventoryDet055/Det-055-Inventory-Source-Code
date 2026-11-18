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
  const supabase =
    await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const cadetId = String(
    formData.get("cadet_id") ??
      ""
  );

  const rawInventory =
    String(
      formData.get(
        "inventory_json"
      ) ?? ""
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
   * Merge duplicate variants within
   * the same submission.
   *
   * Example:
   *
   * Size M Qty 1
   * Size M Qty 2
   *
   * becomes:
   *
   * Size M Qty 3
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

  const items = [
    ...merged.entries(),
  ].map(
    ([
      catalogVariantId,
      quantity,
    ]) => ({
      catalog_variant_id:
        catalogVariantId,
      quantity,
    })
  );

  /*
   * Issue all selected items through
   * the database transaction layer.
   *
   * The RPC handles:
   *
   * - permissions
   * - cadet validation
   * - variant validation
   * - room stock reduction
   * - zero-stock issuance
   * - uncounted issuance
   * - cadet inventory increases
   * - audit events
   *
   * The batch RPC is atomic, so if one
   * item fails the whole batch rolls back.
   */
  const {
    error: issueError,
  } = await supabase.rpc(
    "issue_inventory_batch_to_cadet",
    {
      p_cadet_id: cadetId,

      p_items: items,

      p_notes:
        "Issued through cadet inventory profile",
    }
  );

  if (issueError) {
    throw new Error(
      issueError.message
    );
  }

  redirect(
    `/cadets/${cadetId}`
  );
}

/*
 * Single-item issue action.
 *
 * Kept for the older single-item form
 * and any other part of the app that
 * still uses it.
 */
export async function addCadetInventoryItem(
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

  const cadetId = String(
    formData.get("cadet_id") ??
      ""
  );

  const variantId = String(
    formData.get(
      "catalog_variant_id"
    ) ?? ""
  );

  const quantity = Number(
    formData.get("quantity")
  );

  if (
    !cadetId ||
    !variantId
  ) {
    throw new Error(
      "Cadet or inventory item was not provided."
    );
  }

  if (
    !Number.isInteger(
      quantity
    ) ||
    quantity < 1
  ) {
    throw new Error(
      "Quantity must be at least 1."
    );
  }

  /*
   * Use the same transaction layer
   * as the bulk issue workflow.
   */
  const {
    error: issueError,
  } = await supabase.rpc(
    "issue_inventory_to_cadet",
    {
      p_cadet_id:
        cadetId,

      p_catalog_variant_id:
        variantId,

      p_quantity:
        quantity,

      p_notes:
        "Issued through cadet inventory profile",
    }
  );

  if (issueError) {
    throw new Error(
      issueError.message
    );
  }

  redirect(
    `/cadets/${cadetId}`
  );
}