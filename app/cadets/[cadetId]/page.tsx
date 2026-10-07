import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StaffHeader from "@/components/staff-header";
import { adjustInventoryQuantity } from "./actions";

export const instant = false;

type Props = {
  params: Promise<{
    cadetId: string;
  }>;
};

type Variant = {
  id: string;
  app_item_id: string;
  cut: string | null;
  size_display: string;
  sort_order: number;
};

type AppItem = {
  id: string;
  uniform_category: string;
  display_name: string;
  sort_order: number;
};

export default async function CadetProfilePage({
  params,
}: Props) {
  const { cadetId } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  /*
   * Determine signed-in user's roles.
   */
  const {
    data: profileRoles,
    error: profileRolesError,
  } = await supabase
    .from("profile_roles")
    .select("role_id")
    .eq("profile_id", user.id);

  if (profileRolesError) {
    throw new Error(profileRolesError.message);
  }

  const roleIds =
    profileRoles?.map((role) => role.role_id) ?? [];

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
      throw new Error(rolesError.message);
    }

    roleNames =
      roles?.map((role) => role.name) ?? [];
  }

  const isAdmin =
    roleNames.includes("inventory_admin");

  const isAssistant =
    roleNames.includes("inventory_assistant");

  const isCadre =
    roleNames.includes("cadre");

  const isCadet =
    roleNames.includes("cadet");

  const canEdit =
    isAdmin || isAssistant;

  /*
   * Only Inventory staff and Cadre
   * can view cadet profiles.
   */
  if (
    !isAdmin &&
    !isAssistant &&
    !isCadre
  ) {
    if (isCadet) {
      redirect("/my-inventory");
    }

    redirect("/auth/login");
  }

  /*
   * Load target cadet.
   */
  const {
    data: cadet,
    error: cadetError,
  } = await supabase
    .from("cadets")
    .select(`
      id,
      profile_id,
      as_class,
      component,
      status,
      inventory_setup_completed_at,
      created_at,
      updated_at
    `)
    .eq("id", cadetId)
    .maybeSingle();

  if (cadetError || !cadet) {
    notFound();
  }

  /*
   * Load target cadet's profile.
   */
  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(`
      id,
      first_name,
      last_name,
      email
    `)
    .eq("id", cadet.profile_id)
    .single();

  if (profileError || !profile) {
    notFound();
  }

  /*
   * Load current inventory.
   */
  const {
    data: inventoryRows,
    error: inventoryError,
  } = await supabase
    .from("cadet_inventory")
    .select(`
      id,
      catalog_variant_id,
      quantity,
      created_at,
      updated_at
    `)
    .eq("cadet_id", cadet.id);

  if (inventoryError) {
    throw new Error(inventoryError.message);
  }

  const variantIds =
    inventoryRows?.map(
      (record) => record.catalog_variant_id
    ) ?? [];

  /*
   * Load variants used by this cadet.
   */
  let variants: Variant[] = [];

  if (variantIds.length > 0) {
    const {
      data: variantRows,
      error: variantsError,
    } = await supabase
      .from("catalog_variants")
      .select(`
        id,
        app_item_id,
        cut,
        size_display,
        sort_order
      `)
      .in("id", variantIds);

    if (variantsError) {
      throw new Error(
        variantsError.message
      );
    }

    variants =
      (variantRows ?? []) as Variant[];
  }

  /*
   * Determine the friendly inventory items
   * associated with those variants.
   */
  const appItemIds = Array.from(
    new Set(
      variants.map(
        (variant) => variant.app_item_id
      )
    )
  );

  let appItems: AppItem[] = [];

  if (appItemIds.length > 0) {
    const {
      data: appItemRows,
      error: appItemsError,
    } = await supabase
      .from("app_items")
      .select(`
        id,
        uniform_category,
        display_name,
        sort_order
      `)
      .in("id", appItemIds);

    if (appItemsError) {
      throw new Error(
        appItemsError.message
      );
    }

    appItems =
      (appItemRows ?? []) as AppItem[];
  }

  /*
   * Build lookup maps.
   */
  const variantMap = new Map(
    variants.map((variant) => [
      variant.id,
      variant,
    ])
  );

  const appItemMap = new Map(
    appItems.map((item) => [
      item.id,
      item,
    ])
  );

  const categoryOrder = [
    "OCP",
    "Blues",
    "PTG",
    "FDU",
  ];

  /*
   * Combine inventory data with friendly
   * item and variant information.
   */
  const inventory =
    inventoryRows
      ?.map((record) => {
        const variant =
          variantMap.get(
            record.catalog_variant_id
          );

        if (!variant) {
          return null;
        }

        const item =
          appItemMap.get(
            variant.app_item_id
          );

        if (!item) {
          return null;
        }

        return {
          inventoryId:
            record.id,

          quantity:
            record.quantity,

          updatedAt:
            record.updated_at,

          category:
            item.uniform_category,

          itemName:
            item.display_name,

          itemSort:
            item.sort_order,

          variantSort:
            variant.sort_order,

          cut:
            variant.cut,

          size:
            variant.size_display,
        };
      })
      .filter(
        (
          record
        ): record is NonNullable<
          typeof record
        > => record !== null
      )
      .sort((a, b) => {
        const categoryDifference =
          categoryOrder.indexOf(
            a.category
          ) -
          categoryOrder.indexOf(
            b.category
          );

        if (
          categoryDifference !== 0
        ) {
          return categoryDifference;
        }

        if (
          a.itemSort !==
          b.itemSort
        ) {
          return (
            a.itemSort -
            b.itemSort
          );
        }

        return (
          a.variantSort -
          b.variantSort
        );
      }) ?? [];

  /*
   * Quick stats.
   */
  const totalQuantity =
    inventory.reduce(
      (total, item) =>
        total +
        Number(item.quantity ?? 0),
      0
    );

  const lastUpdatedTimestamp =
    inventory.length > 0
      ? Math.max(
          ...inventory.map(
            (item) =>
              new Date(
                item.updatedAt
              ).getTime()
          )
        )
      : null;

  const lastUpdated =
    lastUpdatedTimestamp
      ? new Date(
          lastUpdatedTimestamp
        ).toLocaleString(
          "en-US",
          {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone:
              "America/Los_Angeles",
          }
        )
      : "No inventory activity";

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
        <div className="mx-auto max-w-6xl">
          {/* Back to Cadet Directory */}
          <a
            href="/cadets"
            className="text-sm font-semibold text-white hover:text-black"
          >
            ← Back to Cadets
          </a>

          {/* Cadet Profile Header */}
          <div className="mt-4 rounded-xl bg-white p-6 shadow sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-blue-400">
                  Cadet Inventory Profile
                </p>

                <h1 className="mt-1 text-3xl font-bold text-black">
                  {fullName}
                </h1>

                <p className="mt-2 text-gray-600">
                  AS{" "}
                  {cadet.as_class ??
                    "—"}{" "}
                  •{" "}
                  {cadet.component ??
                    "—"}
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  {profile.email}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-sm font-semibold ${
                    cadet.status ===
                    "active"
                      ? "bg-black text-white"
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {cadet.status}
                </span>

                <span
                  className={`rounded-full px-3 py-1 text-sm font-semibold ${
                    cadet.inventory_setup_completed_at
                      ? "bg-blue-400 text-white"
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {cadet.inventory_setup_completed_at
                    ? "Setup Complete"
                    : "Setup Incomplete"}
                </span>

                {canEdit && (
                  <a
                    href={`/cadets/${cadet.id}/add`}
                    className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800"
                  >
                    + Add Item
                  </a>
                )}
              </div>
            </div>
          </div>

{(isAdmin || isCadre) && (
  <a
    href={`/cadets/${cadet.id}/wings-export`}
    className="rounded-lg bg-black px-5 py-3 text-center font-semibold text-white transition hover:bg-gray-800"
  >
    Export WINGS CSV
  </a>
)}

          {/* Quick Stats */}
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-white p-5 shadow">
              <p className="text-sm font-semibold text-gray-500">
                Items Checked Out
              </p>

              <p className="mt-2 text-3xl font-bold text-black">
                {totalQuantity}
              </p>
            </div>

            <div className="rounded-xl bg-white p-5 shadow">
              <p className="text-sm font-semibold text-gray-500">
                Inventory Records
              </p>

              <p className="mt-2 text-3xl font-bold text-black">
                {inventory.length}
              </p>
            </div>

            <div className="rounded-xl bg-white p-5 shadow">
              <p className="text-sm font-semibold text-gray-500">
                Last Updated
              </p>

              <p className="mt-2 text-sm font-semibold text-black">
                {lastUpdated}
              </p>
            </div>
          </div>

          {/* Inventory Categories */}
          <div className="mt-6 space-y-6">
            {categoryOrder.map(
              (category) => {
                const categoryItems =
                  inventory.filter(
                    (item) =>
                      item.category ===
                      category
                  );

                return (
                  <section
                    key={category}
                    className="rounded-xl bg-white p-6 shadow"
                  >
                    <h2 className="text-xl font-bold text-blue-400">
                      {category}
                    </h2>

                    {categoryItems.length ===
                    0 ? (
                      <p className="mt-4 text-sm text-gray-500">
                        No items on file.
                      </p>
                    ) : (
                      <div className="mt-4 divide-y divide-gray-200">
                        {categoryItems.map(
                          (item) => (
                            <div
                              key={
                                item.inventoryId
                              }
                              className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div>
                                <p className="font-semibold text-black">
                                  {
                                    item.itemName
                                  }
                                </p>

                                <p className="mt-1 text-sm text-gray-600">
                                  {item.cut
                                    ? `${item.cut} • `
                                    : ""}
                                  {
                                    item.size
                                  }
                                </p>
                              </div>

                              {canEdit ? (
                                <div className="flex items-center gap-2">
                                  {/* Decrease Quantity */}
                                  <form
                                    action={
                                      adjustInventoryQuantity
                                    }
                                  >
                                    <input
                                      type="hidden"
                                      name="cadet_id"
                                      value={
                                        cadet.id
                                      }
                                    />

                                    <input
                                      type="hidden"
                                      name="inventory_id"
                                      value={
                                        item.inventoryId
                                      }
                                    />

                                    <input
                                      type="hidden"
                                      name="delta"
                                      value="-1"
                                    />

                                    <button
                                      type="submit"
                                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 font-bold text-black transition hover:bg-gray-100"
                                      title={
                                        item.quantity ===
                                        1
                                          ? "Remove item"
                                          : "Decrease quantity"
                                      }
                                    >
                                      −
                                    </button>
                                  </form>

                                  {/* Quantity */}
                                  <span className="min-w-16 rounded-full bg-blue-400 px-3 py-1 text-center text-sm font-semibold text-white">
                                    Qty{" "}
                                    {
                                      item.quantity
                                    }
                                  </span>

                                  {/* Increase Quantity */}
                                  <form
                                    action={
                                      adjustInventoryQuantity
                                    }
                                  >
                                    <input
                                      type="hidden"
                                      name="cadet_id"
                                      value={
                                        cadet.id
                                      }
                                    />

                                    <input
                                      type="hidden"
                                      name="inventory_id"
                                      value={
                                        item.inventoryId
                                      }
                                    />

                                    <input
                                      type="hidden"
                                      name="delta"
                                      value="1"
                                    />

                                    <button
                                      type="submit"
                                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-black font-bold text-white transition hover:bg-gray-800"
                                      title="Increase quantity"
                                    >
                                      +
                                    </button>
                                  </form>

                                  {/* Edit */}
                                  <a
                                    href={`/cadets/${cadet.id}/${item.inventoryId}/edit`}
                                    className="ml-2 text-sm font-semibold text-blue-500 transition hover:text-black"
                                  >
                                    Edit
                                  </a>
                                </div>
                              ) : (
                                <span className="rounded-full bg-blue-400 px-3 py-1 text-sm font-semibold text-white">
                                  Qty{" "}
                                  {
                                    item.quantity
                                  }
                                </span>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </section>
                );
              }
            )}
          </div>

          {/* Read-only notice for Cadre */}
          {!canEdit && (
            <div className="mt-6 rounded-xl bg-white p-5 shadow">
              <p className="text-sm text-gray-600">
                You have read-only access to this cadet&apos;s inventory.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}