"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function returnInventoryToRoom(
  formData: FormData
) {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const cadetId = String(
    formData.get("cadet_id") ?? ""
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
    !Number.isInteger(quantity) ||
    quantity < 1
  ) {
    throw new Error(
      "Return quantity must be at least 1."
    );
  }

  const { error } =
    await supabase.rpc(
      "return_inventory_from_cadet",
      {
        p_cadet_id:
          cadetId,

        p_catalog_variant_id:
          variantId,

        p_quantity:
          quantity,

        p_notes:
          "Returned through cadet inventory profile",
      }
    );

  if (error) {
    throw new Error(
      error.message
    );
  }

  redirect(
    `/cadets/${cadetId}`
  );
}
