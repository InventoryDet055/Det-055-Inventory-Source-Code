"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type SubmittedInventoryItem = {
  catalog_variant_id: string;
  quantity: number;
};

export async function completeInventorySetup(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const rawInventory = String(formData.get("inventory_json") ?? "");

  if (!rawInventory) {
    throw new Error("No inventory data was submitted.");
  }

  let submitted: SubmittedInventoryItem[];

  try {
    submitted = JSON.parse(rawInventory);
  } catch {
    throw new Error("Inventory submission was invalid.");
  }

  if (!Array.isArray(submitted)) {
    throw new Error("Inventory submission was invalid.");
  }

  const { data: cadet, error: cadetError } = await supabase
    .from("cadets")
    .select("id")
    .eq("profile_id", user.id)
    .eq("status", "active")
    .single();

  if (cadetError || !cadet) {
    throw new Error("No active cadet profile exists.");
  }

  // Merge duplicate variants if the same size was accidentally
  // entered twice during setup.
  const merged = new Map<string, number>();

  for (const item of submitted) {
    if (
      !item.catalog_variant_id ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1
    ) {
      throw new Error("One or more inventory entries are invalid.");
    }

    merged.set(
      item.catalog_variant_id,
      (merged.get(item.catalog_variant_id) ?? 0) + item.quantity
    );
  }

  const variantIds = [...merged.keys()];

  if (variantIds.length > 0) {
    // Validate that every submitted variant really exists
    // and is currently available for cadet use.
    const { data: validVariants, error: variantError } = await supabase
      .from("catalog_variants")
      .select(`
        id,
        app_items!inner (
          active
        )
      `)
      .in("id", variantIds)
      .eq("active", true)
      .eq("app_items.active", true);

    if (variantError) {
      throw new Error(variantError.message);
    }

    if ((validVariants?.length ?? 0) !== variantIds.length) {
      throw new Error(
        "One or more selected inventory variants are no longer valid."
      );
    }

    const rows = variantIds.map((variantId) => ({
      cadet_id: cadet.id,
      catalog_variant_id: variantId,
      quantity: merged.get(variantId)!,
    }));

    // Setup represents the cadet's stated current quantity.
    // If the exact variant already exists, set it to the submitted
    // quantity instead of adding the quantity again.
    const { error: upsertError } = await supabase
      .from("cadet_inventory")
      .upsert(rows, {
        onConflict: "cadet_id,catalog_variant_id",
      });

    if (upsertError) {
      throw new Error(upsertError.message);
    }
  }

  const { error: completionError } = await supabase.rpc(
    "complete_own_inventory_setup"
  );

  if (completionError) {
    throw new Error(completionError.message);
  }

  redirect("/my-inventory");
}