import { redirect } from "next/navigation";

import StaffHeader from "@/components/staff-header";
import { createClient } from "@/lib/supabase/server";

import SizingTable, {
  SizingRow,
} from "./sizing-table";

export const instant = false;

export default async function SizingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  /*
   * Determine signed-in user's roles.
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
    roleNames.includes(
      "cadre"
    );

  const isCadet =
    roleNames.includes(
      "cadet"
    );

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

  const canEdit =
    isAdmin ||
    isAssistant;

  /*
   * Active cadets only.
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
      status
    `)
    .eq("status", "active")
    .order("as_class");

  if (cadetsError) {
    throw new Error(
      cadetsError.message
    );
  }

  const profileIds =
    cadetRows?.map(
      (cadet) =>
        cadet.profile_id
    ) ?? [];

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

    profiles =
      profileRows ?? [];
  }

  const cadetIds =
    cadetRows?.map(
      (cadet) =>
        cadet.id
    ) ?? [];

  let measurements: {
    cadet_id: string;
    uniform_cut_preference:
      string | null;
    height_inches:
      number | null;
    head_circumference_inches:
      number | null;
    neck_inches:
      number | null;
    chest_bust_inches:
      number | null;
    sleeve_inches:
      number | null;
    waist_inches:
      number | null;
    hips_inches:
      number | null;
    inseam_inches:
      number | null;
    shoe_size:
      number | null;
    shoe_width:
      string | null;
    measured_at:
      string | null;
    notes:
      string | null;
    updated_at:
      string;
  }[] = [];

  if (cadetIds.length > 0) {
    const {
      data: measurementRows,
      error: measurementsError,
    } = await supabase
      .from("cadet_measurements")
      .select(`
        cadet_id,
        uniform_cut_preference,
        height_inches,
        head_circumference_inches,
        neck_inches,
        chest_bust_inches,
        sleeve_inches,
        waist_inches,
        hips_inches,
        inseam_inches,
        shoe_size,
        shoe_width,
        measured_at,
        notes,
        updated_at
      `)
      .in("cadet_id", cadetIds);

    if (measurementsError) {
      throw new Error(
        measurementsError.message
      );
    }

    measurements =
      measurementRows ?? [];
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

  const measurementMap =
    new Map(
      measurements.map(
        (measurement) => [
          measurement.cadet_id,
          measurement,
        ]
      )
    );

  const rows: SizingRow[] =
    (cadetRows ?? [])
      .map((cadet) => {
        const profile =
          profileMap.get(
            cadet.profile_id
          );

        if (!profile) {
          return null;
        }

        const measurement =
          measurementMap.get(
            cadet.id
          );

        return {
          cadetId:
            cadet.id,

          firstName:
            profile.first_name ??
            "",

          lastName:
            profile.last_name ??
            "",

          email:
            profile.email,

          asClass:
            cadet.as_class,

          component:
            cadet.component,

          uniformCutPreference:
            measurement
              ?.uniform_cut_preference ??
            null,

          height:
            measurement
              ?.height_inches ??
            null,

          head:
            measurement
              ?.head_circumference_inches ??
            null,

          neck:
            measurement
              ?.neck_inches ??
            null,

          chestBust:
            measurement
              ?.chest_bust_inches ??
            null,

          sleeve:
            measurement
              ?.sleeve_inches ??
            null,

          waist:
            measurement
              ?.waist_inches ??
            null,

          hips:
            measurement
              ?.hips_inches ??
            null,

          inseam:
            measurement
              ?.inseam_inches ??
            null,

          shoeSize:
            measurement
              ?.shoe_size ??
            null,

          shoeWidth:
            measurement
              ?.shoe_width ??
            null,

          measuredAt:
            measurement
              ?.measured_at ??
            null,
        };
      })
      .filter(
        (
          row
        ): row is SizingRow =>
          row !== null
      )
      .sort((a, b) => {
        const last =
          a.lastName.localeCompare(
            b.lastName
          );

        if (last !== 0) {
          return last;
        }

        return a.firstName.localeCompare(
          b.firstName
        );
      });

  return (
    <div className="min-h-screen bg-blue-400">
      <StaffHeader />

      <main className="p-4 sm:p-8">
        <div className="mx-auto max-w-[1600px]">
          <div className="rounded-xl bg-white p-6 shadow sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-400">
              Uniform Management
            </p>

            <h1 className="mt-1 text-3xl font-bold text-black">
              Global Size Tracker
            </h1>

            <p className="mt-2 max-w-3xl text-sm text-gray-600">
              View cadet measurements
              used for uniform sizing
              and future size
              recommendations.
            </p>
          </div>

          {!canEdit && (
            <div className="mt-6 rounded-xl bg-white p-5 shadow">
              <p className="font-semibold text-black">
                Read-only access
              </p>

              <p className="mt-1 text-sm text-gray-600">
                Cadre can review
                cadet sizing data.
                Inventory staff
                maintain measurement
                records.
              </p>
            </div>
          )}

          <SizingTable
            rows={rows}
            canEdit={canEdit}
          />
        </div>
      </main>
    </div>
  );
}