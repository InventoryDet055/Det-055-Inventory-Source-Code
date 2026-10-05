import { Suspense } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import CadetHeader from "@/components/cadet-header";

async function MyInventoryContent() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email")
    .eq("id", user.id)
    .single();

  const { data: cadet } = await supabase
    .from("cadets")
    .select(
      "id, as_class, component, status, inventory_setup_completed_at"
    )
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!cadet) {
    return (
      <div className="min-h-screen bg-blue-400">
        <CadetHeader />

        <main className="p-4 sm:p-8">
          <div className="mx-auto max-w-4xl">
            <div className="rounded-xl bg-white p-8 shadow">
              <h1 className="text-2xl font-bold text-black">
                No Cadet Profile
              </h1>

              <p className="mt-2 text-gray-600">
                This account does not currently have an active cadet profile.
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const { data: inventory, error } = await supabase
    .from("cadet_inventory_details")
    .select("*")
    .eq("cadet_id", cadet.id)
    .order("uniform_category")
    .order("item_name");

  if (error) {
    console.error(error);

    return (
      <div className="min-h-screen bg-blue-400">
        <CadetHeader />

        <main className="p-4 sm:p-8">
          <div className="mx-auto max-w-4xl">
            <div className="rounded-xl bg-white p-8 shadow">
              <h1 className="text-2xl font-bold text-black">
                Inventory Error
              </h1>

              <p className="mt-2 text-red-600">
                Your inventory could not be loaded.
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const categories = ["OCP", "Blues", "PTG", "FDU"];

  const totalQuantity =
    inventory?.reduce(
      (total, item) => total + Number(item.quantity ?? 0),
      0
    ) ?? 0;

  return (
    <div className="min-h-screen bg-blue-400">
      <CadetHeader />

      <main className="p-4 sm:p-8">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-xl bg-white p-6 shadow">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-blue-400">
                  My Inventory
                </p>

                <h1 className="mt-1 text-3xl font-bold text-black">
                  {profile?.first_name} {profile?.last_name}
                </h1>

                <p className="mt-1 text-gray-600">
                  AS {cadet.as_class} • {cadet.component}
                </p>

                <p className="mt-3 text-sm text-gray-500">
                  {totalQuantity} total items on file
                </p>
              </div>

              <div className="flex gap-3">
                <a
                  href="/my-inventory/history"
                  className="rounded-lg border border-gray-300 px-5 py-3 text-center font-semibold text-black transition hover:bg-gray-100"
                >
                  History
                </a>

                <a
                  href="/my-inventory/add"
                  className="rounded-lg bg-black px-5 py-3 text-center font-semibold text-white transition hover:bg-gray-800"
                >
                  + Add Item
                </a>
              </div>
            </div>
          </div>

          {!cadet.inventory_setup_completed_at && (
            <div className="mt-6 rounded-xl bg-white p-6 shadow">
              <h2 className="text-xl font-bold text-black">
                Set Up Your Inventory
              </h2>

              <p className="mt-2 text-sm text-gray-600">
                Complete your initial inventory setup so Det 055 has an
                accurate record of the uniform items currently issued to you.
              </p>

              <a
                href="/my-inventory/setup"
                className="mt-5 inline-block rounded-lg bg-black px-5 py-3 font-semibold text-white transition hover:bg-gray-800"
              >
                Set Up My Inventory
              </a>
            </div>
          )}

          <div className="mt-6 space-y-6">
            {categories.map((category) => {
              const categoryItems =
                inventory?.filter(
                  (item) => item.uniform_category === category
                ) ?? [];

              return (
                <section
                  key={category}
                  className="rounded-xl bg-white p-6 shadow"
                >
                  <h2 className="text-xl font-bold text-blue-400">
                    {category}
                  </h2>

                  {categoryItems.length === 0 ? (
                    <p className="mt-4 text-sm text-gray-500">
                      No items on file.
                    </p>
                  ) : (
                    <div className="mt-4 divide-y divide-gray-200">
                      {categoryItems.map((item) => (
                        <div
                          key={item.inventory_id}
                          className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p className="font-semibold text-black">
                              {item.item_name}
                            </p>

                            <p className="mt-1 text-sm text-gray-600">
                              {item.cut ? `${item.cut} • ` : ""}
                              {item.size_display}
                            </p>
                          </div>

                          <div className="flex items-center gap-4">
                            <span className="rounded-full bg-blue-400 px-3 py-1 text-sm font-semibold text-white">
                              Qty {item.quantity}
                            </span>

                            <a
                              href={`/my-inventory/${item.inventory_id}/edit`}
                              className="text-sm font-semibold text-blue-500 transition hover:text-black"
                            >
                              Edit
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}

function MyInventoryLoading() {
  return (
    <div className="min-h-screen bg-blue-400">
      <main className="p-4 sm:p-8">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-xl bg-white p-6 shadow">
            <p className="text-sm text-gray-600">
              Loading your inventory...
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function MyInventoryPage() {
  return (
    <Suspense fallback={<MyInventoryLoading />}>
      <MyInventoryContent />
    </Suspense>
  );
}