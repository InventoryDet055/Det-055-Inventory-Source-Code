import { Suspense } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import AddItemForm from "./add-item-form";

async function AddInventoryContent() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Ensure this account belongs to a cadet.
  const {
    data: cadet,
    error: cadetError,
  } = await supabase
    .from("cadets")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (cadetError || !cadet) {
    redirect("/my-inventory");
  }

  const {
    data: items,
    error: itemsError,
  } = await supabase
    .from("app_items")
    .select(
      `
      id,
      display_name,
      uniform_category,
      cut_rule
      `
    )
    .order("uniform_category")
    .order("display_name");

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  const {
    data: variants,
    error: variantsError,
  } = await supabase
    .from("catalog_variants")
    .select(
      `
      id,
      app_item_id,
      cut,
      size_display,
      size_code,
      sort_order
      `
    )
    .eq("active", true)
    .order("sort_order")
    .range(0, 1999);

  if (variantsError) {
    throw new Error(variantsError.message);
  }

  return (
    <main className="min-h-screen bg-blue-400 p-4 sm:p-8">
      <div className="mx-auto max-w-xl">
        <a
          href="/my-inventory"
          className="text-sm font-semibold text-white hover:text-black"
        >
          ← Back to My Inventory
        </a>

        <div className="mt-6 rounded-xl bg-white p-6 shadow sm:p-8">
          <AddItemForm
            items={items ?? []}
            variants={variants ?? []}
          />
        </div>
      </div>
    </main>
  );
}

function AddInventoryLoading() {
  return (
    <main className="min-h-screen bg-blue-400 p-4 sm:p-8">
      <div className="mx-auto max-w-xl">
        <div className="rounded-xl bg-white p-6 shadow sm:p-8">
          <p className="text-sm text-gray-600">
            Loading inventory options...
          </p>
        </div>
      </div>
    </main>
  );
}

export default function AddInventoryPage() {
  return (
    <Suspense fallback={<AddInventoryLoading />}>
      <AddInventoryContent />
    </Suspense>
  );
}