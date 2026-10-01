"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function editInventoryItem(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const inventoryId = String(
    formData.get("inventory_id") ?? ""
  );

  const variantId = String(
    formData.get("catalog_variant_id") ?? ""
  );

  const quantity = Number(
    formData.get("quantity")
  );

  if (!inventoryId) {
    throw new Error("Inventory record was not provided.");
  }

  if (!variantId) {
    throw new Error("A size must be selected.");
  }

  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error("Quantity must be at least 1.");
  }

  const { error } = await supabase.rpc(
    "update_own_inventory_item",
    {
      p_inventory_id: inventoryId,
      p_target_variant_id: variantId,
      p_quantity: quantity,
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  redirect("/my-inventory");
}