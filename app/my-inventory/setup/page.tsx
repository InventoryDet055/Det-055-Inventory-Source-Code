import { Suspense } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import InventorySetupForm from "./setup-inventory-form";

type Props = {
  searchParams: Promise<{
    mode?: string | string[];
  }>;
};

async function InventorySetupContent({
  searchParams,
}: Props) {
  const params = await searchParams;

  const mode =
    params.mode === "add"
      ? "add"
      : "setup";

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: cadet } = await supabase
    .from("cadets")
    .select(
      "id, inventory_setup_completed_at"
    )
    .eq("profile_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!cadet) {
    redirect("/my-inventory");
  }

  /*
   * Initial setup can only be completed once.
   */
  if (
    mode === "setup" &&
    cadet.inventory_setup_completed_at
  ) {
    redirect("/my-inventory");
  }

  /*
   * The Add Items workflow is intended
   * for cadets who already completed setup.
   */
  if (
    mode === "add" &&
    !cadet.inventory_setup_completed_at
  ) {
    redirect("/my-inventory/setup");
  }

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
   * We currently have more than
   * Supabase's normal 1,000-row limit.
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
          <InventorySetupForm
            items={items ?? []}
            variants={variants ?? []}
            mode={mode}
          />
        </div>
      </div>
    </main>
  );
}

function InventorySetupLoading() {
  return (
    <main className="min-h-screen bg-blue-400 p-4 sm:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-xl bg-white p-6 shadow sm:p-8">
          <p className="text-sm text-gray-600">
            Loading inventory...
          </p>
        </div>
      </div>
    </main>
  );
}

export default function InventorySetupPage(
  props: Props
) {
  return (
    <Suspense
      fallback={
        <InventorySetupLoading />
      }
    >
      <InventorySetupContent
        {...props}
      />
    </Suspense>
  );
}