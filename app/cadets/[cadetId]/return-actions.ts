"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function returnInventoryToRoom(
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

  const catalogVariantId = String(
    formData.get("catalog_variant_id") ?? ""
  );

  if (!cadetId || !catalogVariantId) {
    throw new Error(
      "Cadet or inventory item was not provided."
    );
  }

  const { error } = await supabase.rpc(
    "return_inventory_from_cadet",
    {
      p_cadet_id: cadetId,
      p_catalog_variant_id:
        catalogVariantId,
      p_quantity: 1,
      p_notes:
        "Returned through cadet inventory profile",
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  redirect(`/cadets/${cadetId}`);
}
