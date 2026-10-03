import {
  notFound,
  redirect,
} from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import StaffHeader from "@/components/staff-header";
import AddCadetItemForm from "./add-item-form";

export const instant = false;

type Props = {
  params: Promise<{
    cadetId: string;
  }>;
};

export default async function AddCadetItemPage({
  params,
}: Props) {
  const { cadetId } =
    await params;

  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  /*
   * Determine user roles.
   */
  const { data: profileRoles } =
    await supabase
      .from("profile_roles")
      .select("role_id")
      .eq("profile_id", user.id);

  const roleIds =
    profileRoles?.map(
      (role) => role.role_id
    ) ?? [];

  let roleNames: string[] = [];

  if (roleIds.length > 0) {
    const { data: roles } =
      await supabase
        .from("roles")
        .select("name")
        .in("id", roleIds);

    roleNames =
      roles?.map(
        (role) => role.name
      ) ?? [];
  }

  const isAdmin =
    roleNames.includes(
      "inventory_admin"
    );

  const isAssistant =
    roleNames.includes(
      "inventory_assistant"
    );

  const isCadet =
    roleNames.includes("cadet");

  if (
    !isAdmin &&
    !isAssistant
  ) {
    redirect("/dashboard");
  }

  /*
   * Load target cadet.
   */
  const { data: cadet } =
    await supabase
      .from("cadets")
      .select(
        "id, profile_id"
      )
      .eq("id", cadetId)
      .maybeSingle();

  if (!cadet) {
    notFound();
  }

  const { data: profile } =
    await supabase
      .from("profiles")
      .select(
        "first_name, last_name, email"
      )
      .eq(
        "id",
        cadet.profile_id
      )
      .single();

  if (!profile) {
    notFound();
  }

  const { data: items, error: itemsError } =
    await supabase
      .from("app_items")
      .select(`
        id,
        uniform_category,
        display_name,
        cut_rule,
        sort_order
      `)
      .eq("active", true)
      .order("sort_order");

  if (itemsError) {
    throw new Error(
      itemsError.message
    );
  }

  const {
    data: variants,
    error: variantsError,
  } = await supabase
    .from("catalog_variants")
    .select(`
      id,
      app_item_id,
      cut,
      size_display,
      size_code,
      sort_order
    `)
    .eq("active", true)
    .order("sort_order")
    .range(0, 1999);

  if (variantsError) {
    throw new Error(
      variantsError.message
    );
  }

  const fullName =
    `${profile.first_name ?? ""} ${
      profile.last_name ?? ""
    }`.trim() ||
    profile.email;

  return (
    <div className="min-h-screen bg-blue-400">
      <StaffHeader
        showMyInventory={isCadet}
      />

      <main className="p-4 sm:p-8">
        <div className="mx-auto max-w-xl">
          <a
            href={`/cadets/${cadetId}`}
            className="text-sm font-semibold text-white hover:text-black"
          >
            ← Back to {fullName}
          </a>

          <div className="mt-4 rounded-xl bg-white p-6 shadow sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-400">
              Inventory Management
            </p>

            <h1 className="mt-1 text-2xl font-bold text-black">
              Add Item
            </h1>

            <p className="mt-2 text-sm text-gray-600">
              Add issued inventory to{" "}
              {fullName}.
            </p>

            <div className="mt-6">
              <AddCadetItemForm
                cadetId={cadetId}
                items={items ?? []}
                variants={
                  variants ?? []
                }
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}