import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

type InventoryEvent = {
  id: string;
  event_type: string;
  before_data: unknown;
  after_data: unknown;
  actor_profile_id: string | null;
  created_at: string;
};

type CatalogVariant = {
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

function getObject(value: unknown): Record<string, unknown> | null {
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

export default async function InventoryHistoryPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: cadet } = await supabase
    .from("cadets")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!cadet) {
    redirect("/my-inventory");
  }

  const { data: eventData, error: eventsError } =
    await supabase
      .from("inventory_events")
      .select(`
        id,
        event_type,
        before_data,
        after_data,
        actor_profile_id,
        created_at
      `)
      .eq("cadet_id", cadet.id)
      .order("created_at", {
        ascending: false,
      })
      .limit(100);

  if (eventsError) {
    throw new Error(eventsError.message);
  }

  const events =
    (eventData ?? []) as InventoryEvent[];

  const variantIds = Array.from(
    new Set(
      events.flatMap((event) => {
        const beforeVariant = getString(
          event.before_data,
          "catalog_variant_id"
        );

        const afterVariant = getString(
          event.after_data,
          "catalog_variant_id"
        );

        return [
          beforeVariant,
          afterVariant,
        ].filter(
          (id): id is string => Boolean(id)
        );
      })
    )
  );

  let variants: CatalogVariant[] = [];

  if (variantIds.length > 0) {
    const {
      data: variantData,
      error: variantsError,
    } = await supabase
      .from("catalog_variants")
      .select(`
        id,
        app_item_id,
        cut,
        size_display
      `)
      .in("id", variantIds);

    if (variantsError) {
      throw new Error(
        variantsError.message
      );
    }

    variants =
      (variantData ?? []) as CatalogVariant[];
  }

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
      data: appItemData,
      error: appItemsError,
    } = await supabase
      .from("app_items")
      .select(`
        id,
        display_name,
        uniform_category
      `)
      .in("id", appItemIds);

    if (appItemsError) {
      throw new Error(
        appItemsError.message
      );
    }

    appItems =
      (appItemData ?? []) as AppItem[];
  }

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

  function describeVariant(
    variantId: string | null
  ) {
    if (!variantId) {
      return {
        name: "Inventory Item",
        category: "",
        description: "",
      };
    }

    const variant =
      variantMap.get(variantId);

    if (!variant) {
      return {
        name: "Inventory Item",
        category: "",
        description: "",
      };
    }

    const item =
      appItemMap.get(variant.app_item_id);

    const description = [
      variant.cut,
      variant.size_display,
    ]
      .filter(Boolean)
      .join(" • ");

    return {
      name:
        item?.display_name ??
        "Inventory Item",

      category:
        item?.uniform_category ?? "",

      description,
    };
  }

  function describeEvent(
    event: InventoryEvent
  ) {
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
      describeVariant(beforeVariantId);

    const after =
      describeVariant(afterVariantId);

    const item =
      afterVariantId ? after : before;

    if (event.event_type === "item_added") {
      return {
        title: `Added ${after.name}`,
        category: after.category,
        details: [
          after.description,
          afterQuantity !== null
            ? `Qty ${afterQuantity}`
            : null,
        ]
          .filter(Boolean)
          .join(" • "),
      };
    }

    if (
      event.event_type ===
      "quantity_changed"
    ) {
      return {
        title: `${item.name} quantity changed`,
        category: item.category,
        details: [
          item.description,
          beforeQuantity !== null &&
          afterQuantity !== null
            ? `Qty ${beforeQuantity} → ${afterQuantity}`
            : null,
        ]
          .filter(Boolean)
          .join(" • "),
      };
    }

    if (
      event.event_type ===
      "variant_changed"
    ) {
      return {
        title: `${item.name} size changed`,
        category: item.category,
        details: [
          before.description &&
          after.description
            ? `${before.description} → ${after.description}`
            : after.description,
          afterQuantity !== null
            ? `Qty ${afterQuantity}`
            : null,
        ]
          .filter(Boolean)
          .join(" • "),
      };
    }

    if (
      event.event_type ===
      "item_removed"
    ) {
      return {
        title: `Removed ${before.name}`,
        category: before.category,
        details: [
          before.description,
          beforeQuantity !== null
            ? `Qty ${beforeQuantity}`
            : null,
        ]
          .filter(Boolean)
          .join(" • "),
      };
    }

    return {
      title: `Updated ${item.name}`,
      category: item.category,
      details: [
        before.description &&
        after.description &&
        before.description !==
          after.description
          ? `${before.description} → ${after.description}`
          : after.description ||
            before.description,

        beforeQuantity !== null &&
        afterQuantity !== null &&
        beforeQuantity !== afterQuantity
          ? `Qty ${beforeQuantity} → ${afterQuantity}`
          : afterQuantity !== null
          ? `Qty ${afterQuantity}`
          : null,
      ]
        .filter(Boolean)
        .join(" • "),
    };
  }

  return (
    <main className="min-h-screen bg-blue-400 p-4 sm:p-8">
      <div className="mx-auto max-w-4xl">
        <a
          href="/my-inventory"
          className="text-sm font-semibold text-white hover:text-black"
        >
          ← Back to My Inventory
        </a>

        <div className="mt-6 rounded-xl bg-white p-6 shadow sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-400">
            My Inventory
          </p>

          <h1 className="mt-1 text-3xl font-bold text-black">
            Inventory History
          </h1>

          <p className="mt-2 text-sm text-gray-600">
            A record of changes made to your
            issued inventory.
          </p>
        </div>

        {events.length === 0 ? (
          <div className="mt-6 rounded-xl bg-white p-8 text-center shadow">
            <p className="font-semibold text-black">
              No inventory history yet.
            </p>

            <p className="mt-2 text-sm text-gray-500">
              Changes to your inventory will
              appear here.
            </p>
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-xl bg-white shadow">
            {events.map((event, index) => {
              const description =
                describeEvent(event);

              const actor =
                event.actor_profile_id ===
                user.id
                  ? "You"
                  : event.actor_profile_id
                  ? "Inventory Staff"
                  : "System";

              const date =
                new Date(
                  event.created_at
                ).toLocaleString(
                  "en-US",
                  {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone:
                      "America/Los_Angeles",
                  }
                );

              return (
                <div
                  key={event.id}
                  className={`p-5 sm:p-6 ${
                    index !==
                    events.length - 1
                      ? "border-b border-gray-200"
                      : ""
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      {description.category && (
                        <p className="text-xs font-semibold uppercase tracking-wide text-blue-400">
                          {
                            description.category
                          }
                        </p>
                      )}

                      <h2 className="mt-1 font-semibold text-black">
                        {description.title}
                      </h2>

                      {description.details && (
                        <p className="mt-1 text-sm text-gray-600">
                          {
                            description.details
                          }
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 text-left sm:text-right">
                      <p className="text-sm text-gray-600">
                        {date}
                      </p>

                      <p className="mt-1 text-xs font-semibold text-gray-400">
                        {actor}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}