import {
  notFound,
  redirect,
} from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import StaffHeader from "@/components/staff-header";
import EditCadetItemForm from "./edit-item-form";

export const instant = false;

type Props = {
  params: Promise<{
    cadetId: string;
    inventoryId: string;
  }>;
};

export default async function EditCadetInventoryPage({
  params,
}: Props) {
  const {
    cadetId,
    inventoryId,
  } = await params;

  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const {
    data: profileRoles,
    error: profileRolesError,
  } = await supabase
    .from("profile_roles")
    .select("role_id")
    .eq("profile_id", user.id);

  if (profileRolesError) {
    throw new Error(
      profileRolesError.message
    );
  }

  const roleIds =
    profileRoles?.map(
      (role) => role.role_id
    ) ?? [];

  let roleNames: string[] = [];

  if (roleIds.length > 0) {
    const {
      data: roles,
      error: rolesError,
    } = await supabase
      .from("roles")
      .select("name")
      .in("id", roleIds);

    if (rolesError) {
      throw new Error(
        rolesError.message
      );
    }

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

  const {
    data: cadet,
    error: cadetError,
  } = await supabase
    .from("cadets")
    .select(`
      id,
      profile_id
    `)
    .eq("id", cadetId)
    .maybeSingle();

  if (
    cadetError ||
    !cadet
  ) {
    notFound();
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(`
      first_name,
      last_name,
      email
    `)
    .eq(
      "id",
      cadet.profile_id
    )
    .single();

  if (
    profileError ||
    !profile
  ) {
    notFound();
  }

  const {
    data: inventory,
    error: inventoryError,
  } = await supabase
    .from("cadet_inventory")
    .select(`
      id,
      cadet_id,
      catalog_variant_id,
      quantity
    `)
    .eq("id", inventoryId)
    .eq("cadet_id", cadetId)
    .maybeSingle();

  if (
    inventoryError ||
    !inventory
  ) {
    notFound();
  }

  const {
    data: currentVariant,
    error: variantError,
  } = await supabase
    .from("catalog_variants")
    .select(`
      id,
      app_item_id,
      cut,
      size_display,
      size_code
    `)
    .eq(
      "id",
      inventory.catalog_variant_id
    )
    .single();

  if (
    variantError ||
    !currentVariant
  ) {
    notFound();
  }

  const {
    data: item,
    error: itemError,
  } = await supabase
    .from("app_items")
    .select(`
      id,
      display_name,
      uniform_category,
      cut_rule
    `)
    .eq(
      "id",
      currentVariant.app_item_id
    )
    .single();

  if (
    itemError ||
    !item
  ) {
    notFound();
  }

  const {
    data: variants,
    error: variantsError,
  } = await supabase
    .from("catalog_variants")
    .select(`
      id,
      cut,
      size_display,
      size_code,
      sort_order
    `)
    .eq(
      "app_item_id",
      item.id
    )
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
              Edit Item
            </h1>

            <p className="mt-2 text-sm text-gray-600">
              Update inventory for {fullName}.
            </p>

            <div className="mt-6">
              <EditCadetItemForm
                cadetId={cadetId}
                inventoryId={
                  inventory.id
                }
                item={item}
                currentVariantId={
                  inventory.catalog_variant_id
                }
                currentCut={
                  currentVariant.cut
                }
                currentQuantity={
                  inventory.quantity
                }
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