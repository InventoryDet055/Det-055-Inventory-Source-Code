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