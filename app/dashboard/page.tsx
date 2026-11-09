import { Suspense } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import StaffHeader from "@/components/staff-header";

const PAGE_SIZE = 1000;

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

  /*
   * Only staff/cadre accounts can use
   * the dashboard.
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
   * Load cadets for dashboard statistics.
   */
  const {
    data: cadets,
    error: cadetsError,
  } = await supabase
    .from("cadets")
    .select(`
      id,
      status,
      inventory_setup_completed_at
    `);

  if (cadetsError) {
    throw new Error(
      cadetsError.message
    );
  }

  /*
   * Load the full inventory summary.
   *
   * This is paginated because the
   * catalog contains more than 1,000
   * possible variants.
   */
  const inventorySummary: {
    room_quantity: number;
    issued_quantity: number;
    total_accounted_quantity: number;
  }[] = [];

  let from = 0;

  while (true) {
    const {
      data,
      error,
    } = await supabase
      .from(
        "inventory_variant_summary"
      )
      .select(`
        room_quantity,
        issued_quantity,
        total_accounted_quantity
      `)
      .range(
        from,
        from + PAGE_SIZE - 1
      );

    if (error) {
      throw new Error(
        error.message
      );
    }

    const batch =
      data ?? [];

    inventorySummary.push(
      ...batch
    );

    if (
      batch.length <
      PAGE_SIZE
    ) {
      break;
    }

    from += PAGE_SIZE;
  }

  const activeCadets =
    cadets?.filter(
      (cadet) =>
        cadet.status ===
        "active"
    ) ?? [];

  const setupComplete =
    activeCadets.filter(
      (cadet) =>
        cadet.inventory_setup_completed_at !==
        null
    ).length;

  const setupRemaining =
    activeCadets.length -
    setupComplete;

  /*
   * Full accountability numbers.
   */
  const roomItems =
    inventorySummary.reduce(
      (total, row) =>
        total +
        Number(
          row.room_quantity ??
            0
        ),
      0
    );

  const totalIssuedItems =
    inventorySummary.reduce(
      (total, row) =>
        total +
        Number(
          row.issued_quantity ??
            0
        ),
      0
    );

  const totalAccountedItems =
    inventorySummary.reduce(
      (total, row) =>
        total +
        Number(
          row.total_accounted_quantity ??
            0
        ),
      0
    );

  const accountName =
    profile?.first_name ||
    profile?.last_name
      ? `${profile?.first_name ?? ""} ${
          profile?.last_name ?? ""
        }`.trim()
      : profile?.email ??
        "Inventory Staff";

  return (
    <div className="min-h-screen bg-blue-400">
      <StaffHeader
        showMyInventory={
          isCadet
        }
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
              Signed in as{" "}
              {accountName}
            </p>
          </div>

          {/* Statistics */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label="Active Cadets"
              value={
                activeCadets.length
              }
            />

            <StatCard
              label="Setup Complete"
              value={
                setupComplete
              }
            />

            <StatCard
              label="Setup Remaining"
              value={
                setupRemaining
              }
            />

            <StatCard
              label="In Inventory Room"
              value={roomItems}
            />

            <StatCard
              label="Issued to Cadets"
              value={
                totalIssuedItems
              }
            />

            <StatCard
              label="Total Accounted"
              value={
                totalAccountedItems
              }
            />
          </div>

          {/* Quick Actions */}
          <div className="mt-6 rounded-xl bg-white p-6 shadow sm:p-8">
            <h2 className="text-xl font-bold text-black">
              Inventory Management
            </h2>

            <p className="mt-2 text-sm text-gray-600">
              Manage physical
              inventory, cadet
              holdings, activity,
              and WINGS records.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <a
                href="/cadets"
                className="rounded-xl border border-gray-200 p-5 transition hover:bg-gray-50"
              >
                <p className="font-semibold text-blue-500">
                  Cadets
                </p>

                <p className="mt-1 text-sm text-gray-600">
                  Search cadets
                  and manage their
                  issued inventory.
                </p>
              </a>

              <a
                href="/inventory-room"
                className="rounded-xl border border-gray-200 p-5 transition hover:bg-gray-50"
              >
                <p className="font-semibold text-blue-500">
                  Inventory Room
                </p>

                <p className="mt-1 text-sm text-gray-600">
                  Count physical
                  stock and see
                  total inventory
                  accountability.
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
                  Review and
                  export
                  WINGS-ready
                  inventory data.
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
                  Review inventory
                  changes across
                  Det 055.
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
                    Manage users,
                    roles, cadet
                    status, and
                    system
                    settings.
                  </p>
                </a>
              ) : (
                <div className="rounded-xl border border-gray-200 p-5 opacity-60">
                  <p className="font-semibold text-black">
                    Admin
                  </p>

                  <p className="mt-1 text-sm text-gray-600">
                    Inventory
                    Admin access
                    required.
                  </p>
                </div>
              )}

              {isCadet && (
                <a
                  href="/my-inventory"
                  className="rounded-xl border border-gray-200 p-5 transition hover:bg-gray-50"
                >
                  <p className="font-semibold text-blue-500">
                    My Inventory
                  </p>

                  <p className="mt-1 text-sm text-gray-600">
                    Review your
                    own issued
                    inventory.
                  </p>
                </a>
              )}
            </div>
          </div>

          {/* Setup Status */}
          {setupRemaining >
            0 && (
            <div className="mt-6 rounded-xl bg-white p-6 shadow">
              <h2 className="text-lg font-bold text-black">
                Inventory Setup
                Progress
              </h2>

              <p className="mt-2 text-sm text-gray-600">
                {setupRemaining}{" "}
                active{" "}
                {setupRemaining ===
                1
                  ? "cadet has"
                  : "cadets have"}{" "}
                not completed
                initial inventory
                setup.
              </p>

              <div className="mt-4 h-3 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full bg-black"
                  style={{
                    width:
                      activeCadets.length ===
                      0
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
                {
                  activeCadets.length
                }{" "}
                complete
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl bg-white p-6 shadow">
      <p className="text-sm font-semibold text-gray-500">
        {label}
      </p>

      <p className="mt-2 text-3xl font-bold text-black">
        {value.toLocaleString()}
      </p>
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
              Loading
              dashboard...
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <DashboardLoading />
      }
    >
      <DashboardContent />
    </Suspense>
  );
}