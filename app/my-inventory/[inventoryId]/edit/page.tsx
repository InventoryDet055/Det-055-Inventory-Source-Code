import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EditItemForm from "./edit-item-form";

export const instant = false;

type Props = {
  params: Promise<{
    inventoryId: string;
  }>;
};

export default async function EditInventoryPage({
  params,
}: Props) {
  const { inventoryId } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Because of RLS, a cadet can only retrieve
  // their own inventory record here.
  const {
    data: inventory,
    error: inventoryError,
  } = await supabase
    .from("cadet_inventory")
    .select(
      "id, catalog_variant_id, quantity"
    )
    .eq("id", inventoryId)
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
    .select(
      `
      id,
      app_item_id,
      cut,
      size_display,
      size_code
      `
    )
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
    .select(
      `
      id,
      display_name,
      uniform_category,
      cut_rule
      `
    )
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
    .select(
      `
      id,
      cut,
      size_display,
      size_code,
      sort_order
      `
    )
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
          <EditItemForm
            inventoryId={inventory.id}
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
    </main>
  );
}