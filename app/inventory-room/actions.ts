"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function setRoomInventoryCount(
  formData: FormData
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const catalogVariantId = String(
    formData.get("catalog_variant_id") ?? ""
  );

  const quantity = Number(
    formData.get("quantity")
  );

  const notes = String(
    formData.get("notes") ?? ""
  ).trim();

  if (!catalogVariantId) {
    throw new Error(
      "Catalog variant was not provided."
    );
  }

  if (
    !Number.isInteger(quantity) ||
    quantity < 0
  ) {
    throw new Error(
      "Room quantity must be a whole number of zero or greater."
    );
  }

  const { error } = await supabase.rpc(
    "set_room_inventory_count",
    {
      p_catalog_variant_id:
        catalogVariantId,
      p_quantity: quantity,
      p_notes: notes || null,
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/inventory-room");
}

export async function setRoomInventoryCountsBulk(
  formData: FormData
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const notes = String(
    formData.get("notes") ?? ""
  ).trim();

  const updates: {
    catalogVariantId: string;
    quantity: number;
  }[] = [];

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("quantity__")) {
      continue;
    }

    const rawValue = String(value).trim();

    /*
     * Blank means:
     * "I did not count this variant."
     */
    if (rawValue === "") {
      continue;
    }

    const catalogVariantId =
      key.slice("quantity__".length);

    const quantity = Number(rawValue);

    if (!catalogVariantId) {
      throw new Error(
        "A catalog variant was not provided."
      );
    }

    if (
      !Number.isInteger(quantity) ||
      quantity < 0
    ) {
      throw new Error(
        "Every room quantity must be a whole number of zero or greater."
      );
    }

    updates.push({
      catalogVariantId,
      quantity,
    });
  }

  if (updates.length === 0) {
    throw new Error(
      "Enter at least one physical count before saving."
    );
  }

  /*
   * Reuse the existing audited RPC for every count.
   *
   * This preserves:
   * - role checks
   * - room inventory behavior
   * - last_counted_at
   * - inventory event logging
   */
  for (const update of updates) {
    const { error } = await supabase.rpc(
      "set_room_inventory_count",
      {
        p_catalog_variant_id:
          update.catalogVariantId,

        p_quantity:
          update.quantity,

        p_notes:
          notes || "Bulk physical inventory count",
      }
    );

    if (error) {
      throw new Error(
        `Failed to save a physical count: ${error.message}`
      );
    }
  }

  revalidatePath("/inventory-room");
}