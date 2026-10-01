import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StaffHeader from "@/components/staff-header";
import CadetDirectory from "./cadet-directory";

export const instant = false;

export default async function CadetsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  /*
   * Get signed-in user's roles.
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
   * Only inventory staff and cadre
   * can access the cadet directory.
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
   * Load cadet records.
   */
  const {
    data: cadetRows,
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
    `)
    .order("as_class");

  if (cadetsError) {
    throw new Error(
      cadetsError.message
    );
  }

  const profileIds =
    cadetRows?.map(
      (cadet) => cadet.profile_id
    ) ?? [];

  /*
   * Load the associated profile information.
   */
  let profiles: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
  }[] = [];

  if (profileIds.length > 0) {
    const {
      data: profileRows,
      error: profilesError,
    } = await supabase
      .from("profiles")
      .select(
        "id, first_name, last_name, email"
      )
      .in("id", profileIds);

    if (profilesError) {
      throw new Error(
        profilesError.message
      );
    }

    profiles = profileRows ?? [];
  }

  const profileMap = new Map(
    profiles.map((profile) => [
      profile.id,
      profile,
    ])
  );

  const cadets =
    cadetRows
      ?.map((cadet) => {
        const profile =
          profileMap.get(
            cadet.profile_id
          );

        return {
          id: cadet.id,

          firstName:
            profile?.first_name ??
            "",

          lastName:
            profile?.last_name ??
            "",

          email:
            profile?.email ??
            "",

          asClass:
            cadet.as_class,

          component:
            cadet.component,

          status:
            cadet.status,

          setupCompleted:
            Boolean(
              cadet.inventory_setup_completed_at
            ),
        };
      })
      .sort((a, b) => {
        const lastName =
          a.lastName.localeCompare(
            b.lastName
          );

        if (lastName !== 0) {
          return lastName;
        }

        return a.firstName.localeCompare(
          b.firstName
        );
      }) ?? [];

  return (
    <div className="min-h-screen bg-blue-400">
      <StaffHeader
        showMyInventory={isCadet}
      />

      <main className="p-4 sm:p-8">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-xl bg-white p-6 shadow">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-400">
              Inventory Management
            </p>

            <h1 className="mt-1 text-3xl font-bold text-black">
              Cadets
            </h1>

            <p className="mt-2 text-sm text-gray-600">
              Search the Det 055 cadet roster and open individual inventory profiles.
            </p>
          </div>

          <CadetDirectory
            cadets={cadets}
          />
        </div>
      </main>
    </div>
  );
}