import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function HomePage() {
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
    redirect("/auth/login");
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

  // Staff roles take priority because a user
  // may be both a cadet and inventory staff.
  if (
    roleNames.includes("inventory_admin") ||
    roleNames.includes("inventory_assistant") ||
    roleNames.includes("cadre")
  ) {
    redirect("/dashboard");
  }

  if (roleNames.includes("cadet")) {
    redirect("/my-inventory");
  }

  redirect("/auth/login");
}