import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StaffHeader from "@/components/staff-header";
import AdminUsers from "./admin-users";

export const instant = false;

export default async function AdminPage() {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    redirect(
      "/auth/login"
    );
  }

  /*
   * Current user's roles.
   */
  const {
    data: currentRoleRows,
    error: currentRoleError,
  } = await supabase
    .from("profile_roles")
    .select(`
      role_id,
      roles!inner (
        name
      )
    `)
    .eq(
      "profile_id",
      user.id
    );

  if (
    currentRoleError
  ) {
    throw new Error(
      currentRoleError.message
    );
  }

  const currentRoles =
    currentRoleRows?.map(
      (row: any) =>
        row.roles.name
    ) ?? [];

  const isAdmin =
    currentRoles.includes(
      "inventory_admin"
    );

  if (!isAdmin) {
    redirect(
      "/dashboard"
    );
  }

  const showMyInventory =
    currentRoles.includes(
      "cadet"
    );

  /*
   * Profiles.
   */
  const {
    data: profiles,
    error: profilesError,
  } = await supabase
    .from("profiles")
    .select(`
      id,
      first_name,
      last_name,
      email,
      active,
      created_at
    `)
    .order(
      "last_name",
      {
        ascending: true,
      }
    );

  if (profilesError) {
    throw new Error(
      profilesError.message
    );
  }

  /*
   * Cadets.
   */
  const {
    data: cadets,
    error: cadetsError,
  } = await supabase
    .from("cadets")
    .select(`
      id,
      profile_id,
      as_class,
      component,
      status,
      inventory_setup_completed_at
    `);

  if (cadetsError) {
    throw new Error(
      cadetsError.message
    );
  }

  /*
   * All role assignments.
   */
  const {
    data: roleAssignments,
    error: roleAssignmentsError,
  } = await supabase
    .from("profile_roles")
    .select(`
      profile_id,
      role_id
    `);

  if (
    roleAssignmentsError
  ) {
    throw new Error(
      roleAssignmentsError.message
    );
  }

  /*
   * Role definitions.
   */
  const {
    data: roles,
    error: rolesError,
  } = await supabase
    .from("roles")
    .select(`
      id,
      name
    `);

  if (rolesError) {
    throw new Error(
      rolesError.message
    );
  }

  const cadetByProfile =
    new Map(
      (
        cadets ?? []
      ).map(
        (cadet) => [
          cadet.profile_id,
          cadet,
        ]
      )
    );

  const roleNameById =
    new Map(
      (
        roles ?? []
      ).map(
        (role) => [
          role.id,
          role.name,
        ]
      )
    );

  const rolesByProfile =
    new Map<
      string,
      string[]
    >();

  for (
    const assignment of
    roleAssignments ?? []
  ) {
    const roleName =
      roleNameById.get(
        assignment.role_id
      );

    if (!roleName) {
      continue;
    }

    const existing =
      rolesByProfile.get(
        assignment.profile_id
      ) ?? [];

    existing.push(
      roleName
    );

    rolesByProfile.set(
      assignment.profile_id,
      existing
    );
  }

  const users =
    (
      profiles ?? []
    ).map(
      (profile) => {
        const cadet =
          cadetByProfile.get(
            profile.id
          );

        return {
          profileId:
            profile.id,

          firstName:
            profile.first_name ??
            "",

          lastName:
            profile.last_name ??
            "",

          email:
            profile.email,

          roles:
            rolesByProfile.get(
              profile.id
            ) ?? [],

          cadetId:
            cadet?.id ??
            null,

          asClass:
            cadet?.as_class ??
            null,

          component:
            cadet?.component ??
            null,

          cadetStatus:
            cadet?.status ??
            null,

          setupComplete:
            Boolean(
              cadet?.inventory_setup_completed_at
            ),
        };
      }
    );

  const activeCadets =
    users.filter(
      (user) =>
        user.cadetStatus ===
        "active"
    ).length;

  const inventoryStaff =
    users.filter(
      (user) =>
        user.roles.includes(
          "inventory_admin"
        ) ||
        user.roles.includes(
          "inventory_assistant"
        )
    ).length;

  const cadreCount =
    users.filter(
      (user) =>
        user.roles.includes(
          "cadre"
        )
    ).length;

  return (
    <div className="min-h-screen bg-blue-400">
      <StaffHeader
        showMyInventory={
          showMyInventory
        }
      />

      <main className="p-4 sm:p-8">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-xl bg-white p-6 shadow sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-400">
              System Administration
            </p>

            <h1 className="mt-1 text-3xl font-bold text-black">
              Admin
            </h1>

            <p className="mt-2 text-sm text-gray-600">
              Manage Det 055
              user roles and
              cadet account
              status.
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-4">
            <StatCard
              label="Accounts"
              value={
                users.length
              }
            />

            <StatCard
              label="Active Cadets"
              value={
                activeCadets
              }
            />

            <StatCard
              label="Inventory Staff"
              value={
                inventoryStaff
              }
            />

            <StatCard
              label="Cadre"
              value={
                cadreCount
              }
            />
          </div>

          <AdminUsers
            users={users}
            currentProfileId={
              user.id
            }
          />
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
    <div className="rounded-xl bg-white p-5 shadow">
      <p className="text-sm font-semibold text-gray-500">
        {label}
      </p>

      <p className="mt-2 text-3xl font-bold text-black">
        {value}
      </p>
    </div>
  );
}