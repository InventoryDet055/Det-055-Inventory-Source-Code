import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StaffHeader from "@/components/staff-header";
import WingsTable, {
  UnmappedRow,
  WingsRow,
} from "./wings-table";

export const instant = false;

export default async function WingsPage() {
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
   * Determine roles.
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

  let roleNames: string[] =
    [];

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

  const isCadre =
    roleNames.includes(
      "cadre"
    );

  const isCadet =
    roleNames.includes(
      "cadet"
    );

  if (
    !isAdmin &&
    !isAssistant &&
    !isCadre
  ) {
    if (isCadet) {
      redirect(
        "/my-inventory"
      );
    }

    redirect("/auth/login");
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
      cadet_id,
      catalog_variant_id,
      quantity
    `);

  if (inventoryError) {
    throw new Error(
      inventoryError.message
    );
  }

  const inventory =
    inventoryRows ?? [];

  /*
   * Cadets.
   */
  const cadetIds =
    Array.from(
      new Set(
        inventory.map(
          (row) =>
            row.cadet_id
        )
      )
    );

  let cadets: {
    id: string;
    profile_id: string;
    as_class: number | null;
    component: string | null;
  }[] = [];

  if (cadetIds.length > 0) {
    const {
      data,
      error,
    } = await supabase
      .from("cadets")
      .select(`
        id,
        profile_id,
        as_class,
        component
      `)
      .in("id", cadetIds);

    if (error) {
      throw new Error(
        error.message
      );
    }

    cadets = data ?? [];
  }

  /*
   * Profiles.
   */
  const profileIds =
    cadets.map(
      (cadet) =>
        cadet.profile_id
    );

  let profiles: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
  }[] = [];

  if (
    profileIds.length > 0
  ) {
    const {
      data,
      error,
    } = await supabase
      .from("profiles")
      .select(`
        id,
        first_name,
        last_name,
        email
      `)
      .in(
        "id",
        profileIds
      );

    if (error) {
      throw new Error(
        error.message
      );
    }

    profiles = data ?? [];
  }

  /*
   * Catalog variants.
   */
  const variantIds =
    Array.from(
      new Set(
        inventory.map(
          (row) =>
            row.catalog_variant_id
        )
      )
    );

  let variants: {
    id: string;
    app_item_id: string;
    cut: string | null;
    size_display: string;
  }[] = [];

  if (
    variantIds.length > 0
  ) {
    const {
      data,
      error,
    } = await supabase
      .from(
        "catalog_variants"
      )
      .select(`
        id,
        app_item_id,
        cut,
        size_display
      `)
      .in(
        "id",
        variantIds
      );

    if (error) {
      throw new Error(
        error.message
      );
    }

    variants = data ?? [];
  }

  /*
   * Friendly app items.
   */
  const appItemIds =
    Array.from(
      new Set(
        variants.map(
          (variant) =>
            variant.app_item_id
        )
      )
    );

  let appItems: {
    id: string;
    uniform_category: string;
    display_name: string;
  }[] = [];

  if (
    appItemIds.length > 0
  ) {
    const {
      data,
      error,
    } = await supabase
      .from("app_items")
      .select(`
        id,
        uniform_category,
        display_name
      `)
      .in(
        "id",
        appItemIds
      );

    if (error) {
      throw new Error(
        error.message
      );
    }

    appItems = data ?? [];
  }

  /*
   * Mapping links.
   */
  let mappingLinks: {
    catalog_variant_id: string;
    wings_item_no: string;
    quantity_multiplier: number;
    mapping_role: string;
  }[] = [];

  if (
    variantIds.length > 0
  ) {
    const {
      data,
      error,
    } = await supabase
      .from(
        "catalog_variant_wings"
      )
      .select(`
        catalog_variant_id,
        wings_item_no,
        quantity_multiplier,
        mapping_role
      `)
      .in(
        "catalog_variant_id",
        variantIds
      );

    if (error) {
      throw new Error(
        error.message
      );
    }

    mappingLinks =
      data ?? [];
  }

  /*
   * WINGS catalog rows.
   */
  const wingsItemNumbers =
    Array.from(
      new Set(
        mappingLinks.map(
          (link) =>
            link.wings_item_no
        )
      )
    );

  let wingsVariants: {
    wings_item_no: string;
    item_name: string;
    category: string;
    subcategory: string;
    sex: string | null;
    size: string | null;
    nsn: string | null;
    uom: string | null;
  }[] = [];

  if (
    wingsItemNumbers.length >
    0
  ) {
    const {
      data,
      error,
    } = await supabase
      .from("wings_variants")
      .select(`
        wings_item_no,
        item_name,
        category,
        subcategory,
        sex,
        size,
        nsn,
        uom
      `)
      .in(
        "wings_item_no",
        wingsItemNumbers
      );

    if (error) {
      throw new Error(
        error.message
      );
    }

    wingsVariants =
      data ?? [];
  }

  /*
   * Lookup maps.
   */
  const cadetMap =
    new Map(
      cadets.map(
        (cadet) => [
          cadet.id,
          cadet,
        ]
      )
    );

  const profileMap =
    new Map(
      profiles.map(
        (profile) => [
          profile.id,
          profile,
        ]
      )
    );

  const variantMap =
    new Map(
      variants.map(
        (variant) => [
          variant.id,
          variant,
        ]
      )
    );

  const appItemMap =
    new Map(
      appItems.map(
        (item) => [
          item.id,
          item,
        ]
      )
    );

  const wingsMap =
    new Map(
      wingsVariants.map(
        (wings) => [
          wings.wings_item_no,
          wings,
        ]
      )
    );

  const linksByVariant =
    new Map<
      string,
      typeof mappingLinks
    >();

  for (
    const link of mappingLinks
  ) {
    const existing =
      linksByVariant.get(
        link.catalog_variant_id
      ) ?? [];

    existing.push(link);

    linksByVariant.set(
      link.catalog_variant_id,
      existing
    );
  }

  const wingsRows: WingsRow[] =
    [];

  const unmappedRows: UnmappedRow[] =
    [];

  /*
   * Translate every current
   * inventory record.
   */
  for (
    const record of inventory
  ) {
    const cadet =
      cadetMap.get(
        record.cadet_id
      );

    const variant =
      variantMap.get(
        record.catalog_variant_id
      );

    if (
      !cadet ||
      !variant
    ) {
      continue;
    }

    const profile =
      profileMap.get(
        cadet.profile_id
      );

    const appItem =
      appItemMap.get(
        variant.app_item_id
      );

    if (
      !profile ||
      !appItem
    ) {
      continue;
    }

    const links =
      linksByVariant.get(
        variant.id
      ) ?? [];

    /*
     * Alternative mappings are
     * intentionally excluded from
     * the ready-to-enter rows so
     * that we do not create duplicate
     * WINGS entries.
     */
    const readyLinks =
      links.filter(
        (link) =>
          link.mapping_role ===
            "primary" ||
          link.mapping_role ===
            "composite_component"
      );

    if (
      readyLinks.length ===
      0
    ) {
      unmappedRows.push({
        id: record.id,
        cadetId:
          cadet.id,

        firstName:
          profile.first_name ??
          "",

        lastName:
          profile.last_name ??
          "",

        email:
          profile.email,

        asClass:
          cadet.as_class,

        component:
          cadet.component,

        sourceCategory:
          appItem.uniform_category,

        sourceItem:
          appItem.display_name,

        sourceCut:
          variant.cut,

        sourceSize:
          variant.size_display,

        quantity:
          record.quantity,
      });

      continue;
    }

    for (
      const link of readyLinks
    ) {
      const wings =
        wingsMap.get(
          link.wings_item_no
        );

      if (!wings) {
        continue;
      }

      wingsRows.push({
        id:
          `${record.id}-${link.wings_item_no}`,

        cadetId:
          cadet.id,

        firstName:
          profile.first_name ??
          "",

        lastName:
          profile.last_name ??
          "",

        email:
          profile.email,

        asClass:
          cadet.as_class,

        component:
          cadet.component,

        sourceCategory:
          appItem.uniform_category,

        sourceItem:
          appItem.display_name,

        sourceCut:
          variant.cut,

        sourceSize:
          variant.size_display,

        sourceQuantity:
          record.quantity,

        wingsItemNo:
          wings.wings_item_no,

        wingsItemName:
          wings.item_name,

        wingsCategory:
          wings.category,

        wingsSubcategory:
          wings.subcategory,

        wingsSex:
          wings.sex,

        wingsSize:
          wings.size,

        wingsQuantity:
          record.quantity *
          Number(
            link.quantity_multiplier
          ),

        nsn:
          wings.nsn,

        uom:
          wings.uom,

        mappingRole:
          link.mapping_role,
      });
    }
  }

  wingsRows.sort(
    (a, b) => {
      const lastName =
        a.lastName.localeCompare(
          b.lastName
        );

      if (
        lastName !== 0
      ) {
        return lastName;
      }

      const firstName =
        a.firstName.localeCompare(
          b.firstName
        );

      if (
        firstName !== 0
      ) {
        return firstName;
      }

      return (
        a.wingsItemName.localeCompare(
          b.wingsItemName
        )
      );
    }
  );

  unmappedRows.sort(
    (a, b) => {
      const lastName =
        a.lastName.localeCompare(
          b.lastName
        );

      if (
        lastName !== 0
      ) {
        return lastName;
      }

      return (
        a.sourceItem.localeCompare(
          b.sourceItem
        )
      );
    }
  );

  const representedCadets =
    new Set(
      wingsRows.map(
        (row) =>
          row.cadetId
      )
    ).size;

  return (
    <div className="min-h-screen bg-blue-400">
      <StaffHeader
        showMyInventory={
          isCadet
        }
      />

      <main className="p-4 sm:p-8">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="rounded-xl bg-white p-6 shadow sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-400">
              Inventory Management
            </p>

            <h1 className="mt-1 text-3xl font-bold text-black">
              WINGS
            </h1>

            <p className="mt-2 text-sm text-gray-600">
              Translate Det 055 cadet inventory into WINGS-ready records.
            </p>
          </div>

          {/* Stats */}
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-white p-5 shadow">
              <p className="text-sm font-semibold text-gray-500">
                WINGS-Ready Rows
              </p>

              <p className="mt-2 text-3xl font-bold text-black">
                {
                  wingsRows.length
                }
              </p>
            </div>

            <div className="rounded-xl bg-white p-5 shadow">
              <p className="text-sm font-semibold text-gray-500">
                Unmapped Records
              </p>

              <p className="mt-2 text-3xl font-bold text-black">
                {
                  unmappedRows.length
                }
              </p>
            </div>

            <div className="rounded-xl bg-white p-5 shadow">
              <p className="text-sm font-semibold text-gray-500">
                Cadets Represented
              </p>

              <p className="mt-2 text-3xl font-bold text-black">
                {
                  representedCadets
                }
              </p>
            </div>
          </div>

          <WingsTable
            rows={
              wingsRows
            }
            unmappedRows={
              unmappedRows
            }
          />
        </div>
      </main>
    </div>
  );
}