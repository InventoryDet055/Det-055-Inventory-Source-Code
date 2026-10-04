import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StaffHeader from "@/components/staff-header";
import ActivityList, {
  ActivityRecord,
} from "./activity-list";

export const instant = false;

type InventoryEvent = {
  id: string;
  cadet_id: string;
  actor_profile_id: string | null;
  event_type: string;
  before_data: unknown;
  after_data: unknown;
  created_at: string;
};

type Variant = {
  id: string;
  app_item_id: string;
  cut: string | null;
  size_display: string;
};

type AppItem = {
  id: string;
  display_name: string;
  uniform_category: string;
};

function getObject(
  value: unknown
): Record<string, unknown> | null {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as Record<string, unknown>;
  }

  return null;
}

function getString(
  value: unknown,
  key: string
): string | null {
  const object = getObject(value);

  if (!object) {
    return null;
  }

  const result = object[key];

  return typeof result === "string"
    ? result
    : null;
}

function getNumber(
  value: unknown,
  key: string
): number | null {
  const object = getObject(value);

  if (!object) {
    return null;
  }

  const result = object[key];

  return typeof result === "number"
    ? result
    : null;
}

export default async function ActivityPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  /*
   * Roles
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

  const isCadre =
    roleNames.includes("cadre");

  const isCadet =
    roleNames.includes("cadet");

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
   * Events
   */
  const {
    data: eventRows,
    error: eventError,
  } = await supabase
    .from("inventory_events")
    .select(`
      id,
      cadet_id,
      actor_profile_id,
      event_type,
      before_data,
      after_data,
      created_at
    `)
    .order("created_at", {
      ascending: false,
    })
    .limit(250);

  if (eventError) {
    throw new Error(
      eventError.message
    );
  }

  const events =
    (eventRows ?? []) as InventoryEvent[];

  /*
   * Cadet identities
   */
  const cadetIds = Array.from(
    new Set(
      events.map(
        (event) => event.cadet_id
      )
    )
  );

  let cadetRows: {
    id: string;
    profile_id: string;
  }[] = [];

  if (cadetIds.length > 0) {
    const {
      data,
      error,
    } = await supabase
      .from("cadets")
      .select("id, profile_id")
      .in("id", cadetIds);

    if (error) {
      throw new Error(error.message);
    }

    cadetRows = data ?? [];
  }

  const actorProfileIds =
    events
      .map(
        (event) =>
          event.actor_profile_id
      )
      .filter(
        (
          id
        ): id is string =>
          Boolean(id)
      );

  const cadetProfileIds =
    cadetRows.map(
      (cadet) =>
        cadet.profile_id
    );

  const allProfileIds =
    Array.from(
      new Set([
        ...actorProfileIds,
        ...cadetProfileIds,
      ])
    );

  let profiles: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
  }[] = [];

  if (allProfileIds.length > 0) {
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
      .in("id", allProfileIds);

    if (error) {
      throw new Error(error.message);
    }

    profiles = data ?? [];
  }

  const profileMap =
    new Map(
      profiles.map(
        (profile) => [
          profile.id,
          profile,
        ]
      )
    );

  const cadetMap =
    new Map(
      cadetRows.map(
        (cadet) => [
          cadet.id,
          cadet,
        ]
      )
    );

  /*
   * Variants referenced by history JSON.
   */
  const variantIds =
    Array.from(
      new Set(
        events.flatMap(
          (event) => {
            const before =
              getString(
                event.before_data,
                "catalog_variant_id"
              );

            const after =
              getString(
                event.after_data,
                "catalog_variant_id"
              );

            return [
              before,
              after,
            ].filter(
              (
                id
              ): id is string =>
                Boolean(id)
            );
          }
        )
      )
    );

  let variants: Variant[] = [];

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
      throw new Error(error.message);
    }

    variants =
      (data ?? []) as Variant[];
  }

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
        display_name,
        uniform_category
      `)
      .in("id", appItemIds);

    if (error) {
      throw new Error(error.message);
    }

    appItems =
      (data ?? []) as AppItem[];
  }

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

  function profileName(
    profileId: string | null
  ) {
    if (!profileId) {
      return "System";
    }

    const profile =
      profileMap.get(
        profileId
      );

    if (!profile) {
      return "Unknown User";
    }

    const name =
      `${profile.first_name ?? ""} ${
        profile.last_name ?? ""
      }`.trim();

    return (
      name ||
      profile.email
    );
  }

  function cadetName(
    cadetId: string
  ) {
    const cadet =
      cadetMap.get(
        cadetId
      );

    if (!cadet) {
      return "Unknown Cadet";
    }

    return profileName(
      cadet.profile_id
    );
  }

  function describeVariant(
    variantId: string | null
  ) {
    if (!variantId) {
      return {
        itemName:
          "Inventory Item",
        category: "",
        description: "",
      };
    }

    const variant =
      variantMap.get(
        variantId
      );

    if (!variant) {
      return {
        itemName:
          "Inventory Item",
        category: "",
        description: "",
      };
    }

    const item =
      appItemMap.get(
        variant.app_item_id
      );

    return {
      itemName:
        item?.display_name ??
        "Inventory Item",

      category:
        item?.uniform_category ??
        "",

      description: [
        variant.cut,
        variant.size_display,
      ]
        .filter(Boolean)
        .join(" • "),
    };
  }

  const activity: ActivityRecord[] =
    events.map((event) => {
      const beforeVariantId =
        getString(
          event.before_data,
          "catalog_variant_id"
        );

      const afterVariantId =
        getString(
          event.after_data,
          "catalog_variant_id"
        );

      const beforeQuantity =
        getNumber(
          event.before_data,
          "quantity"
        );

      const afterQuantity =
        getNumber(
          event.after_data,
          "quantity"
        );

      const before =
        describeVariant(
          beforeVariantId
        );

      const after =
        describeVariant(
          afterVariantId
        );

      const item =
        afterVariantId
          ? after
          : before;

      let title =
        `Updated ${item.itemName}`;

      let details = "";

      if (
        event.event_type ===
        "item_added"
      ) {
        title =
          `Added ${after.itemName}`;

        details = [
          after.description,
          afterQuantity !== null
            ? `Qty ${afterQuantity}`
            : null,
        ]
          .filter(Boolean)
          .join(" • ");
      } else if (
        event.event_type ===
        "quantity_changed"
      ) {
        title =
          `${item.itemName} quantity changed`;

        details = [
          item.description,
          beforeQuantity !== null &&
          afterQuantity !== null
            ? `Qty ${beforeQuantity} → ${afterQuantity}`
            : null,
        ]
          .filter(Boolean)
          .join(" • ");
      } else if (
        event.event_type ===
        "variant_changed"
      ) {
        title =
          `${item.itemName} size changed`;

        details = [
          before.description &&
          after.description
            ? `${before.description} → ${after.description}`
            : after.description,
          afterQuantity !== null
            ? `Qty ${afterQuantity}`
            : null,
        ]
          .filter(Boolean)
          .join(" • ");
      } else if (
        event.event_type ===
        "item_removed"
      ) {
        title =
          `Removed ${before.itemName}`;

        details = [
          before.description,
          beforeQuantity !== null
            ? `Qty ${beforeQuantity}`
            : null,
        ]
          .filter(Boolean)
          .join(" • ");
      } else {
        details = [
          before.description &&
          after.description &&
          before.description !==
            after.description
            ? `${before.description} → ${after.description}`
            : after.description ||
              before.description,

          beforeQuantity !== null &&
          afterQuantity !== null &&
          beforeQuantity !==
            afterQuantity
            ? `Qty ${beforeQuantity} → ${afterQuantity}`
            : afterQuantity !== null
            ? `Qty ${afterQuantity}`
            : null,
        ]
          .filter(Boolean)
          .join(" • ");
      }

      return {
        id: event.id,
        cadetId:
          event.cadet_id,
        cadetName:
          cadetName(
            event.cadet_id
          ),
        actorName:
          profileName(
            event.actor_profile_id
          ),
        category:
          item.category,
        itemName:
          item.itemName,
        eventType:
          event.event_type,
        title,
        details,
        createdAt:
          event.created_at,
      };
    });

  return (
    <div className="min-h-screen bg-blue-400">
      <StaffHeader
        showMyInventory={
          isCadet
        }
      />

      <main className="p-4 sm:p-8">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-xl bg-white p-6 shadow sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-400">
              Inventory Management
            </p>

            <h1 className="mt-1 text-3xl font-bold text-black">
              Activity
            </h1>

            <p className="mt-2 text-sm text-gray-600">
              Review inventory changes across Det 055.
            </p>
          </div>

          <ActivityList
            activity={
              activity
            }
          />
        </div>
      </main>
    </div>
  );
}