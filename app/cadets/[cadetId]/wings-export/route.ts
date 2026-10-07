import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    cadetId: string;
  }>;
};

type CatalogVariant = {
  id: string;
  app_item_id: string;
  cut: string | null;
  size_display: string;
};

type AppItem = {
  id: string;
  uniform_category: string;
  display_name: string;
};

type MappingLink = {
  catalog_variant_id: string;
  wings_item_no: string;
  quantity_multiplier: number;
  mapping_role: string;
};

type WingsVariant = {
  wings_item_no: string;
  item_name: string;
  category: string;
  subcategory: string;
  sex: string | null;
  size: string | null;
  nsn: string | null;
  uom: string | null;
};

type ExportRow = {
  sourceCategory: string;
  sourceItem: string;
  sourceCut: string | null;
  sourceSize: string;
  physicalQuantity: number;

  wingsItemNo: string;
  wingsItemName: string;
  wingsCategory: string;
  wingsSubcategory: string;
  wingsSex: string;
  wingsSize: string;
  wingsQuantity: number | "";
  nsn: string;
  uom: string;
};

function quoteValue(
  value: string | number | null | undefined
) {
  const text =
    value === null || value === undefined
      ? ""
      : String(value);

  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(
  _request: NextRequest,
  { params }: RouteContext
) {
  const { cadetId } = await params;

  const supabase = await createClient();

  /*
   * Authenticate current user.
   */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse("Unauthorized", {
      status: 401,
    });
  }

  /*
   * Determine current user's roles.
   */
  const {
    data: profileRoles,
    error: profileRolesError,
  } = await supabase
    .from("profile_roles")
    .select("role_id")
    .eq("profile_id", user.id);

  if (profileRolesError) {
    console.error(
      "WINGS export role lookup error:",
      profileRolesError.message
    );

    return new NextResponse(
      "Unable to verify permissions.",
      {
        status: 500,
      }
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
      console.error(
        "WINGS export role name error:",
        rolesError.message
      );

      return new NextResponse(
        "Unable to verify permissions.",
        {
          status: 500,
        }
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

  const isCadre =
    roleNames.includes("cadre");

  /*
   * Only Inventory Admin and Cadre
   * may use the export.
   */
  if (!isAdmin && !isCadre) {
    return new NextResponse("Forbidden", {
      status: 403,
    });
  }

  /*
   * Load requested cadet.
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
      component
    `)
    .eq("id", cadetId)
    .maybeSingle();

  if (cadetError) {
    console.error(
      "WINGS export cadet error:",
      cadetError.message
    );

    return new NextResponse(
      "Unable to load cadet.",
      {
        status: 500,
      }
    );
  }

  if (!cadet) {
    return new NextResponse(
      "Cadet not found.",
      {
        status: 404,
      }
    );
  }

  /*
   * Load cadet profile.
   */
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
    .eq("id", cadet.profile_id)
    .single();

  if (profileError || !profile) {
    console.error(
      "WINGS export profile error:",
      profileError?.message
    );

    return new NextResponse(
      "Unable to load cadet profile.",
      {
        status: 500,
      }
    );
  }

  /*
   * Load ALL physical inventory
   * for this cadet.
   */
  const {
    data: inventoryRows,
    error: inventoryError,
  } = await supabase
    .from("cadet_inventory")
    .select(`
      id,
      catalog_variant_id,
      quantity
    `)
    .eq("cadet_id", cadetId);

  if (inventoryError) {
    console.error(
      "WINGS export inventory error:",
      inventoryError.message
    );

    return new NextResponse(
      "Unable to load inventory.",
      {
        status: 500,
      }
    );
  }

  const inventory =
    inventoryRows ?? [];

  /*
   * Load catalog variants.
   */
  const variantIds =
    Array.from(
      new Set(
        inventory.map(
          (record) =>
            record.catalog_variant_id
        )
      )
    );

  let variants: CatalogVariant[] = [];

  if (variantIds.length > 0) {
    const {
      data,
      error,
    } = await supabase
      .from("catalog_variants")
      .select(`
        id,
        app_item_id,
        cut,
        size_display
      `)
      .in("id", variantIds);

    if (error) {
      console.error(
        "WINGS export variant error:",
        error.message
      );

      return new NextResponse(
        "Unable to load catalog variants.",
        {
          status: 500,
        }
      );
    }

    variants = data ?? [];
  }

  /*
   * Load friendly app item names.
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

  let appItems: AppItem[] = [];

  if (appItemIds.length > 0) {
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
      .in("id", appItemIds);

    if (error) {
      console.error(
        "WINGS export app item error:",
        error.message
      );

      return new NextResponse(
        "Unable to load app items.",
        {
          status: 500,
        }
      );
    }

    appItems = data ?? [];
  }

  /*
   * Load WINGS mapping links.
   */
  let mappingLinks: MappingLink[] = [];

  if (variantIds.length > 0) {
    const {
      data,
      error,
    } = await supabase
      .from("catalog_variant_wings")
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
      console.error(
        "WINGS export mapping error:",
        error.message
      );

      return new NextResponse(
        "Unable to load WINGS mappings.",
        {
          status: 500,
        }
      );
    }

    mappingLinks = data ?? [];
  }

  /*
   * Load referenced WINGS catalog rows.
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

  let wingsVariants: WingsVariant[] = [];

  if (wingsItemNumbers.length > 0) {
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
      console.error(
        "WINGS export catalog error:",
        error.message
      );

      return new NextResponse(
        "Unable to load WINGS catalog.",
        {
          status: 500,
        }
      );
    }

    wingsVariants = data ?? [];
  }

  /*
   * Build lookup maps.
   */
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
      MappingLink[]
    >();

  for (const link of mappingLinks) {
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

  /*
   * Build combined export rows.
   *
   * Every physical item appears.
   * Known WINGS fields are filled in.
   * Unknown WINGS fields remain blank.
   */
  const exportRows: ExportRow[] = [];

  for (const record of inventory) {
    const variant =
      variantMap.get(
        record.catalog_variant_id
      );

    if (!variant) {
      continue;
    }

    const appItem =
      appItemMap.get(
        variant.app_item_id
      );

    if (!appItem) {
      continue;
    }

    const links =
      linksByVariant.get(
        variant.id
      ) ?? [];

    /*
     * Do not automatically export
     * alternative mappings because that
     * could duplicate WINGS entries.
     */
    const readyLinks =
      links.filter(
        (link) =>
          link.mapping_role ===
            "primary" ||
          link.mapping_role ===
            "composite_component"
      );

    /*
     * No known WINGS mapping.
     *
     * Keep the physical inventory row
     * and leave WINGS-specific fields
     * blank.
     */
    if (readyLinks.length === 0) {
      exportRows.push({
        sourceCategory:
          appItem.uniform_category,

        sourceItem:
          appItem.display_name,

        sourceCut:
          variant.cut,

        sourceSize:
          variant.size_display,

        physicalQuantity:
          record.quantity,

        wingsItemNo: "",
        wingsItemName: "",
        wingsCategory: "",
        wingsSubcategory: "",
        wingsSex: "",
        wingsSize: "",
        wingsQuantity: "",
        nsn: "",
        uom: "",
      });

      continue;
    }

    /*
     * Known mapping.
     *
     * Composite items can create more
     * than one WINGS row.
     */
    for (const link of readyLinks) {
      const wings =
        wingsMap.get(
          link.wings_item_no
        );

      /*
       * If a mapping exists but its
       * WINGS catalog row is missing,
       * still preserve the physical item.
       */
      if (!wings) {
        exportRows.push({
          sourceCategory:
            appItem.uniform_category,

          sourceItem:
            appItem.display_name,

          sourceCut:
            variant.cut,

          sourceSize:
            variant.size_display,

          physicalQuantity:
            record.quantity,

          wingsItemNo: "",
          wingsItemName: "",
          wingsCategory: "",
          wingsSubcategory: "",
          wingsSex: "",
          wingsSize: "",
          wingsQuantity: "",
          nsn: "",
          uom: "",
        });

        continue;
      }

      exportRows.push({
        sourceCategory:
          appItem.uniform_category,

        sourceItem:
          appItem.display_name,

        sourceCut:
          variant.cut,

        sourceSize:
          variant.size_display,

        physicalQuantity:
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
          wings.sex ?? "",

        wingsSize:
          wings.size ?? "",

        wingsQuantity:
          record.quantity *
          Number(
            link.quantity_multiplier
          ),

        nsn:
          wings.nsn ?? "",

        uom:
          wings.uom ?? "",
      });
    }
  }

  /*
   * Keep export consistently ordered.
   */
  exportRows.sort((a, b) => {
    const categoryCompare =
      a.sourceCategory.localeCompare(
        b.sourceCategory
      );

    if (categoryCompare !== 0) {
      return categoryCompare;
    }

    const itemCompare =
      a.sourceItem.localeCompare(
        b.sourceItem
      );

    if (itemCompare !== 0) {
      return itemCompare;
    }

    return a.sourceSize.localeCompare(
      b.sourceSize
    );
  });

  /*
   * Cadre HTML import format.
   */
  const headers = [
    "Cadet",
    "Status",
    "Qty",
    "Item No",
    "Item Name",
    "Category",
    "Subcategory",
    "Sex",
    "Size",
    "NSN",
    "UoM",
    "Source",
    "Unit Price",
    "Line Total",
  ];

  const cadetName = [
    profile.first_name,
    profile.last_name,
  ]
    .filter(Boolean)
    .join(" ");

  const lines = [
    headers
      .map(quoteValue)
      .join(","),

    ...exportRows.map((row) => {
      const quantity =
        row.wingsQuantity === ""
          ? row.physicalQuantity
          : row.wingsQuantity;

      /*
       * Use official WINGS values when
       * available. Fall back to physical
       * inventory values when no WINGS
       * mapping exists.
       */
      const itemName =
        row.wingsItemName ||
        row.sourceItem;

      const category =
        row.wingsCategory ||
        row.sourceCategory;

      const subcategory =
        row.wingsSubcategory || "";

      const sex =
        row.wingsSex ||
        row.sourceCut ||
        "";

      const size =
        row.wingsSize ||
        row.sourceSize;

      return [
        cadetName,
        "Issued",
        quantity,
        row.wingsItemNo,
        itemName,
        category,
        subcategory,
        sex,
        size,
        row.nsn,
        row.uom,
        "Catalog",
        "",
        "",
      ]
        .map(quoteValue)
        .join(",");
    }),
  ];

  /*
   * Return plain text in the browser.
   * Nothing is downloaded.
   */
  const text =
    lines.join("\n");

  return new NextResponse(text, {
    status: 200,
    headers: {
      "Content-Type":
        "text/plain; charset=utf-8",

      "Cache-Control":
        "no-store",
    },
  });
}