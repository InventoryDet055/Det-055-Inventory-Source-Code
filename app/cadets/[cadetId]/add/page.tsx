import { Suspense } from "react";
import {
  notFound,
  redirect,
} from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import StaffHeader from "@/components/staff-header";
import InventorySetupForm from "@/app/my-inventory/setup/setup-inventory-form";

type Props = {
  params: Promise<{
    cadetId: string;
  }>;
};

async function AddCadetItemsContent({
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
    roleNames.includes(
      "cadet"
    );

  if (
    !isAdmin &&
    !isAssistant
  ) {
    redirect("/dashboard");
  }

  /*
   * Load target cadet.
   */
  const {
    data: cadet,
    error: cadetError,
  } = await supabase
    .from("cadets")
    .select(
      "id, profile_id"
    )
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
    .select(
      "first_name, last_name, email"
    )
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

  /*
   * Load friendly item catalog.
   */
  const {
    data: items,
    error: itemsError,
  } = await supabase
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

  /*
   * Load all active variants.
   */
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
        showMyInventory={
          isCadet
        }
      />

      <main className="p-4 sm:p-8">
        <div className="mx-auto max-w-4xl">
          <a
            href={`/cadets/${cadetId}`}
            className="text-sm font-semibold text-white hover:text-black"
          >
            ← Back to {fullName}
          </a>

          <div className="mt-4 rounded-xl bg-white p-6 shadow sm:p-8">
            <InventorySetupForm
              items={items ?? []}
              variants={
                variants ?? []
              }
              mode="add"
              staffCadetId={
                cadetId
              }
              staffCadetName={
                fullName
              }
            />
          </div>
        </div>
      </main>
    </div>
  );
}

function AddCadetItemsLoading() {
  return (
    <div className="min-h-screen bg-blue-400">
      <main className="p-4 sm:p-8">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-xl bg-white p-6 shadow sm:p-8">
            <p className="text-sm text-gray-600">
              Loading inventory...
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function AddCadetItemsPage(
  props: Props
) {
  return (
    <Suspense
      fallback={
        <AddCadetItemsLoading />
      }
    >
      <AddCadetItemsContent
        {...props}
      />
    </Suspense>
  );
}