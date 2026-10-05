import { Suspense } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import StaffHeader from "@/components/staff-header";

async function DashboardContent() {
    const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  /*
   * Load signed-in user's profile.
   */
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email")
    .eq("id", user.id)
    .single();

  /*
   * Determine all roles belonging to this account.
   */
  const { data: profileRoles, error: profileRolesError } =
    await supabase
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
    const { data: roles, error: rolesError } =
      await supabase
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

  /*
   * Only staff/cadre accounts can use the dashboard.
   */
  if (!isAdmin && !isAssistant && !isCadre) {
    if (isCadet) {
      redirect("/my-inventory");
    }

    redirect("/auth/login");
  }

  /*
   * Load cadets for dashboard statistics.
   */
  const { data: cadets, error: cadetsError } =
    await supabase
      .from("cadets")
      .select(
        `
        id,
        status,
        inventory_setup_completed_at
        `
      );

  if (cadetsError) {
    throw new Error(cadetsError.message);
  }

  /*
   * Load issued inventory quantities.
   */
  const { data: inventory, error: inventoryError } =
    await supabase
      .from("cadet_inventory")
      .select("quantity");

  if (inventoryError) {
    throw new Error(inventoryError.message);
  }

  const activeCadets =
    cadets?.filter(
      (cadet) => cadet.status === "active"
    ) ?? [];

  const setupComplete =
    activeCadets.filter(
      (cadet) =>
        cadet.inventory_setup_completed_at !== null
    ).length;

  const setupRemaining =
    activeCadets.length - setupComplete;

  const totalIssuedItems =
    inventory?.reduce(
      (total, record) =>
        total + Number(record.quantity ?? 0),
      0
    ) ?? 0;

  const accountName =
    profile?.first_name || profile?.last_name
      ? `${profile?.first_name ?? ""} ${
          profile?.last_name ?? ""
        }`.trim()
      : profile?.email ?? "Inventory Staff";

  return (
    <div className="min-h-screen bg-blue-400">
      <StaffHeader
        showMyInventory={isCadet}
      />

      <main className="p-4 sm:p-8">
        <div className="mx-auto max-w-6xl">
          {/* Dashboard Header */}
          <div className="rounded-xl bg-white p-6 shadow sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-400">
              Det 055 Inventory
            </p>

            <h1 className="mt-1 text-3xl font-bold text-black">
              Dashboard
            </h1>

            <p className="mt-2 text-sm text-gray-600">
              Signed in as {accountName}
            </p>
          </div>

          {/* Statistics */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-white p-6 shadow">
              <p className="text-sm font-semibold text-gray-500">
                Active Cadets
              </p>

              <p className="mt-2 text-3xl font-bold text-black">
                {activeCadets.length}
              </p>
            </div>

            <div className="rounded-xl bg-white p-6 shadow">
              <p className="text-sm font-semibold text-gray-500">
                Setup Complete
              </p>

              <p className="mt-2 text-3xl font-bold text-black">
                {setupComplete}
              </p>
            </div>

            <div className="rounded-xl bg-white p-6 shadow">
              <p className="text-sm font-semibold text-gray-500">
                Setup Remaining
              </p>

              <p className="mt-2 text-3xl font-bold text-black">
                {setupRemaining}
              </p>
            </div>

            <div className="rounded-xl bg-white p-6 shadow">
              <p className="text-sm font-semibold text-gray-500">
                Items Issued
              </p>

              <p className="mt-2 text-3xl font-bold text-black">
                {totalIssuedItems}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-6 rounded-xl bg-white p-6 shadow sm:p-8">
            <h2 className="text-xl font-bold text-black">
              Inventory Management
            </h2>

            <p className="mt-2 text-sm text-gray-600">
              Manage cadet inventory records and prepare data for WINGS.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <a
                href="/cadets"
                className="rounded-xl border border-gray-200 p-5 transition hover:bg-gray-50"
              >
                <p className="font-semibold text-blue-500">
                  Cadets
                </p>

                <p className="mt-1 text-sm text-gray-600">
                  Search cadets and manage their issued inventory.
                </p>
              </a>

              <a
  href="/wings"
  className="rounded-xl border border-gray-200 p-5 transition hover:bg-gray-50"
>
  <p className="font-semibold text-blue-500">
    WINGS
  </p>

  <p className="mt-1 text-sm text-gray-600">
    Review and export WINGS-ready inventory data.
  </p>
</a>

              <a
  href="/activity"
  className="rounded-xl border border-gray-200 p-5 transition hover:bg-gray-50"
>
  <p className="font-semibold text-blue-500">
    Activity
  </p>

  <p className="mt-1 text-sm text-gray-600">
    Review inventory changes across Det 055.
  </p>
</a>

              {isAdmin ? (
              <a
                href="/admin"
                className="rounded-xl border border-gray-200 p-5 transition hover:bg-gray-50"
              >
                <p className="font-semibold text-blue-500">
                  Admin
                </p>

                <p className="mt-1 text-sm text-gray-600">
                  Manage users, roles, and cadet status.
                </p>
              </a>
            ) : (
              <div className="rounded-xl border border-gray-200 p-5 opacity-60">
                <p className="font-semibold text-black">
                  Admin
                </p>

                <p className="mt-1 text-sm text-gray-600">
                  Inventory Admin access required.
                </p>
              </div>
            )}

          </div>
        </div>

        {/* Setup Status */}
        {setupRemaining > 0 && (
            <div className="mt-6 rounded-xl bg-white p-6 shadow">
              <h2 className="text-lg font-bold text-black">
                Inventory Setup Progress
              </h2>

              <p className="mt-2 text-sm text-gray-600">
                {setupRemaining} active{" "}
                {setupRemaining === 1
                  ? "cadet has"
                  : "cadets have"}{" "}
                not completed initial inventory setup.
              </p>

              <div className="mt-4 h-3 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full bg-black"
                  style={{
                    width:
                      activeCadets.length === 0
                        ? "0%"
                        : `${
                            (setupComplete /
                              activeCadets.length) *
                            100
                          }%`,
                  }}
                />
              </div>

              <p className="mt-2 text-xs text-gray-500">
                {setupComplete} of{" "}
                {activeCadets.length} complete
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
function DashboardLoading() {
  return (
    <div className="min-h-screen bg-blue-400">
      <main className="p-4 sm:p-8">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-xl bg-white p-6 shadow sm:p-8">
            <p className="text-sm text-gray-600">
              Loading dashboard...
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardContent />
    </Suspense>
  );
}