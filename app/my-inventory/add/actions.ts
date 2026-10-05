"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type AddItemResult = {
  success: boolean;
  message: string;
};

export async function addOwnInventoryItem(
  formData: FormData
): Promise<AddItemResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      message: "You must be signed in.",
    };
  }

  const catalogVariantId = String(
    formData.get("catalog_variant_id") ?? ""
  );

  const quantity = Number(
    formData.get("quantity") ?? 1
  );

  if (!catalogVariantId) {
    return {
      success: false,
      message: "Select an item size.",
    };
  }

  if (
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > 99
  ) {
    return {
      success: false,
      message: "Enter a valid quantity.",
    };
  }

  const {
    data: variant,
    error: variantError,
  } = await supabase
    .from("catalog_variants")
    .select("id")
    .eq("id", catalogVariantId)
    .eq("active", true)
    .maybeSingle();

  if (variantError || !variant) {
    return {
      success: false,
      message:
        "That inventory option is not available.",
    };
  }

  const {
    data: cadet,
    error: cadetError,
  } = await supabase
    .from("cadets")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (cadetError || !cadet) {
    return {
      success: false,
      message:
        "This account does not have a cadet profile.",
    };
  }

  const {
    data: existing,
    error: existingError,
  } = await supabase
    .from("cadet_inventory")
    .select("id, quantity")
    .eq("cadet_id", cadet.id)
    .eq(
      "catalog_variant_id",
      catalogVariantId
    )
    .maybeSingle();

  if (existingError) {
    return {
      success: false,
      message: existingError.message,
    };
  }

  if (existing) {
    const newQuantity =
      Number(existing.quantity ?? 0) +
      quantity;

    const { error: updateError } =
      await supabase
        .from("cadet_inventory")
        .update({
          quantity: newQuantity,
          updated_by: user.id,
        })
        .eq("id", existing.id);

    if (updateError) {
      return {
        success: false,
        message: updateError.message,
      };
    }

    revalidatePath("/my-inventory");
    revalidatePath(
      "/my-inventory/history"
    );

    return {
      success: true,
      message:
        "Item already existed, so the quantities were combined.",
    };
  }

  const { error: insertError } =
    await supabase
      .from("cadet_inventory")
      .insert({
        cadet_id: cadet.id,
        catalog_variant_id:
          catalogVariantId,
        quantity,
        created_by: user.id,
        updated_by: user.id,
      });

  if (insertError) {
    return {
      success: false,
      message: insertError.message,
    };
  }

  revalidatePath("/my-inventory");
  revalidatePath(
    "/my-inventory/history"
  );

  return {
    success: true,
    message:
      "Item added to your inventory.",
  };
}