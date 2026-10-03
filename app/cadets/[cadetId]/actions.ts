"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireInventoryStaff() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profileRoles, error: profileRolesError } =
    await supabase
      .from("profile_roles")
      .select("role_id")
      .eq("profile_id", user.id);

  if (profileRolesError) {
    throw new Error(profileRolesError.message);
  }

  const roleIds =
    profileRoles?.map((role) => role.role_id) ?? [];

  if (roleIds.length === 0) {
    throw new Error(
      "You do not have permission to modify inventory."
    );
  }

  const { data: roles, error: rolesError } =
    await supabase
      .from("roles")
      .select("name")
      .in("id", roleIds);

  if (rolesError) {
    throw new Error(rolesError.message);
  }

  const roleNames =
    roles?.map((role) => role.name) ?? [];

  const canEdit =
    roleNames.includes("inventory_admin") ||
    roleNames.includes("inventory_assistant");

  if (!canEdit) {
    throw new Error(
      "You do not have permission to modify inventory."
    );
  }

  return {
    supabase,
    user,
  };
}

export async function adjustInventoryQuantity(
  formData: FormData
) {
  const { supabase } = await requireInventoryStaff();

  const cadetId = String(
    formData.get("cadet_id") ?? ""
  );

  const inventoryId = String(
    formData.get("inventory_id") ?? ""
  );

  const delta = Number(
    formData.get("delta")
  );

  if (!cadetId || !inventoryId) {
    throw new Error(
      "Inventory record was not provided."
    );
  }

  if (delta !== 1 && delta !== -1) {
    throw new Error(
      "Invalid inventory quantity adjustment."
    );
  }

  const { data: inventory, error: inventoryError } =
    await supabase
      .from("cadet_inventory")
      .select("id, cadet_id, quantity")
      .eq("id", inventoryId)
      .eq("cadet_id", cadetId)
      .single();

  if (inventoryError || !inventory) {
    throw new Error(
      "Inventory record could not be found."
    );
  }

  const newQuantity =
    Number(inventory.quantity) + delta;

  if (newQuantity <= 0) {
    // Qty 1 -> pressing minus officially removes
    // the item from the cadet's inventory.
    const { error } = await supabase
      .from("cadet_inventory")
      .delete()
      .eq("id", inventoryId)
      .eq("cadet_id", cadetId);

    if (error) {
      throw new Error(error.message);
    }
  } else {
    const { error } = await supabase
      .from("cadet_inventory")
      .update({
        quantity: newQuantity,
      })
      .eq("id", inventoryId)
      .eq("cadet_id", cadetId);

    if (error) {
      throw new Error(error.message);
    }
  }

  revalidatePath(`/cadets/${cadetId}`);
}