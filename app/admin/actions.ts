"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const MANAGEABLE_ROLES = [
  "inventory_assistant",
  "inventory_admin",
  "cadre",
] as const;

type ManageableRole =
  (typeof MANAGEABLE_ROLES)[number];

const CADET_STATUSES = [
  "active",
  "inactive",
  "archived",
] as const;

type CadetStatus =
  (typeof CADET_STATUSES)[number];

async function requireInventoryAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in.");
  }

  // Find the inventory_admin role ID.
  const {
    data: adminRole,
    error: roleError,
  } = await supabase
    .from("roles")
    .select("id")
    .eq("name", "inventory_admin")
    .single();

  if (roleError || !adminRole) {
    throw new Error(
      roleError?.message ??
        "Inventory Admin role not found."
    );
  }

  // Confirm the signed-in account actually has that role.
  const {
    data: assignment,
    error: assignmentError,
  } = await supabase
    .from("profile_roles")
    .select("profile_id")
    .eq("profile_id", user.id)
    .eq("role_id", adminRole.id)
    .maybeSingle();

  if (assignmentError) {
    throw new Error(assignmentError.message);
  }

  if (!assignment) {
    throw new Error(
      "Inventory Admin access required."
    );
  }

  return {
    supabase,
    user,
  };
}

export async function setProfileRole(
  formData: FormData
) {
  const { supabase, user } =
    await requireInventoryAdmin();

  const profileId = String(
    formData.get("profile_id") ?? ""
  );

  const roleName = String(
    formData.get("role_name") ?? ""
  ) as ManageableRole;

  const enabled =
    String(formData.get("enabled") ?? "") ===
    "true";

  if (!profileId) {
    throw new Error("Missing profile ID.");
  }

  if (!MANAGEABLE_ROLES.includes(roleName)) {
    throw new Error("Invalid role.");
  }

  // Do not allow the signed-in admin to remove
  // their own inventory_admin permission.
  if (
    profileId === user.id &&
    roleName === "inventory_admin" &&
    !enabled
  ) {
    throw new Error(
      "You cannot remove your own Inventory Admin role."
    );
  }

  const {
    data: role,
    error: roleError,
  } = await supabase
    .from("roles")
    .select("id")
    .eq("name", roleName)
    .single();

  if (roleError || !role) {
    throw new Error(
      roleError?.message ?? "Role not found."
    );
  }

  if (enabled) {
    const { error } = await supabase
      .from("profile_roles")
      .upsert(
        {
          profile_id: profileId,
          role_id: role.id,
          assigned_by: user.id,
        },
        {
          onConflict: "profile_id,role_id",
        }
      );

    if (error) {
      throw new Error(error.message);
    }
  } else {
    const { error } = await supabase
      .from("profile_roles")
      .delete()
      .eq("profile_id", profileId)
      .eq("role_id", role.id);

    if (error) {
      throw new Error(error.message);
    }
  }

  revalidatePath("/admin");
  revalidatePath("/dashboard");
}

export async function setCadetStatus(
  formData: FormData
) {
  const { supabase } =
    await requireInventoryAdmin();

  const cadetId = String(
    formData.get("cadet_id") ?? ""
  );

  const status = String(
    formData.get("status") ?? ""
  ) as CadetStatus;

  if (!cadetId) {
    throw new Error("Missing cadet ID.");
  }

  if (!CADET_STATUSES.includes(status)) {
    throw new Error("Invalid cadet status.");
  }

  const { error } = await supabase
    .from("cadets")
    .update({
      status,
    })
    .eq("id", cadetId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin");
  revalidatePath("/cadets");
  revalidatePath(`/cadets/${cadetId}`);
  revalidatePath("/dashboard");
}